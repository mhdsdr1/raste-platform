from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.utils import timezone
import jdatetime


@extend_schema(description='محاسبه اقساط منظم')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_installments(request):
    try:
        total = float(request.data.get('total_amount', 0))
        count = int(request.data.get('installment_count', 0))
    except (ValueError, TypeError):
        return Response({'error': 'مقادیر نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)
    
    if total <= 0:
        return Response({'error': 'مبلغ باید بیشتر از صفر باشد'}, status=status.HTTP_400_BAD_REQUEST)
    if count < 1 or count > 12:
        return Response({'error': 'تعداد اقساط باید بین ۱ تا ۱۲ باشد'}, status=status.HTTP_400_BAD_REQUEST)
    
    today = timezone.now().date()
    today_jd = jdatetime.date.fromgregorian(date=today)
    today_jy = today_jd.year
    today_jm = today_jd.month
    today_jd_day = today_jd.day
    
    if today_jd_day <= 15:
        first_year = today_jy
        first_month = today_jm
    else:
        if today_jm == 12:
            first_year = today_jy + 1
            first_month = 1
        else:
            first_year = today_jy
            first_month = today_jm + 1
    
    base_per = int(total / count / 10000) * 10000
    if base_per <= 0:
        base_per = int(total / count)
    
    last_amount = total - (base_per * (count - 1))
    
    installments = []
    for i in range(count):
        amount = base_per if i < count - 1 else last_amount
        month = first_month + i
        year = first_year
        while month > 12:
            month -= 12
            year += 1
        
        if month <= 6:
            last_day = 31
        elif month <= 11:
            last_day = 30
        else:
            is_leap = (year % 33 in [1, 5, 9, 13, 17, 22, 26, 30])
            last_day = 30 if is_leap else 29
        
        installments.append({
            'number': i + 1,
            'amount': float(amount),
            'due_date_shamsi': f"{year}/{month:02d}/{last_day:02d}",
        })
    
    return Response({
        'total_amount': total,
        'installment_count': count,
        'installments': installments,
    })


@extend_schema(description='لیست طرح‌های اقساط')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_installment_plans(request):
    from .models import InstallmentPlan
    from .serializers import InstallmentPlanSerializer
    from django.db import models
    
    plans = InstallmentPlan.objects.filter(seller=request.user)
    shop_id = request.query_params.get('shop_id')
    if shop_id and shop_id != 'all':
        plans = plans.filter(shop_id=shop_id)
    search = request.query_params.get('search', '')
    if search:
        plans = plans.filter(
            models.Q(person_name__icontains=search) |
            models.Q(person_phone__icontains=search) |
            models.Q(person_national_id__icontains=search)
        )
    return Response({
        'plans': InstallmentPlanSerializer(plans, many=True).data,
        'total_count': plans.count(),
    })


@extend_schema(description='ایجاد طرح اقساط')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_installment_plan(request):
    from .models import InstallmentPlan, Installment, Shop
    from .serializers import InstallmentPlanSerializer
    from apps.orders.views import to_gregorian_date
    from datetime import datetime as dt
    
    if not request.user.is_seller:
        return Response({'error': 'فقط فروشندگان'}, status=status.HTTP_403_FORBIDDEN)
    
    person_name = request.data.get('person_name', '').strip()
    person_phone = request.data.get('person_phone', '').strip()
    person_national_id = request.data.get('person_national_id', '').strip()
    plan_type = request.data.get('plan_type', 'regular')
    installments_data = request.data.get('installments', [])
    
    if not person_name or not person_phone:
        return Response({'error': 'نام و موبایل الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    if not person_national_id:
        return Response({'error': 'کد ملی الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    if not installments_data:
        return Response({'error': 'حداقل یک قسط لازم است'}, status=status.HTTP_400_BAD_REQUEST)
    
    shop_id = request.data.get('shop')
    shop = None
    if shop_id and shop_id != 'all':
        try:
            shop = Shop.objects.get(id=shop_id, owner=request.user)
        except Shop.DoesNotExist:
            pass
    
    total_amount = sum(float(i.get('amount', 0)) for i in installments_data)
    
    try:
        plan = InstallmentPlan.objects.create(
            seller=request.user,
            shop=shop,
            person_name=person_name,
            person_phone=person_phone,
            person_national_id=person_national_id,
            person_postal_code=request.data.get('person_postal_code', ''),
            person_address=request.data.get('person_address', ''),
            plan_type=plan_type,
            total_amount=total_amount,
            installment_count=len(installments_data),
            payment_day=request.data.get('payment_day', 'last'),
            payment_method=request.data.get('payment_method', 'check'),
            guarantee=request.data.get('guarantee', 'check'),
            notes=request.data.get('notes', ''),
            check_serial=request.data.get('check_serial', ''),
            check_notes=request.data.get('check_notes', ''),
            guarantee_serial=request.data.get('guarantee_serial', ''),
            guarantee_notes=request.data.get('guarantee_notes', ''),
        )
        for i, inst_data in enumerate(installments_data):
            due_str = inst_data.get('due_date_shamsi', '')
            greg = to_gregorian_date(due_str)
            if greg and isinstance(greg, str):
                greg = dt.strptime(greg, '%Y-%m-%d').date()
            Installment.objects.create(
                plan=plan,
                number=i + 1,
                amount=inst_data.get('amount', 0),
                due_date=greg,
            )
        return Response(InstallmentPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'خطا: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='تغییر وضعیت پرداخت قسط')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_installment_paid(request, installment_id):
    from .models import Installment
    from .serializers import InstallmentSerializer
    try:
        inst = Installment.objects.get(id=installment_id, plan__seller=request.user)
    except Installment.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    inst.is_paid = not inst.is_paid
    inst.paid_date = timezone.now().date() if inst.is_paid else None
    inst.save()
    return Response(InstallmentSerializer(inst).data)


@extend_schema(description='حذف طرح اقساط')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_installment_plan(request, plan_id):
    from .models import InstallmentPlan
    try:
        plan = InstallmentPlan.objects.get(id=plan_id, seller=request.user)
        plan.delete()
        return Response({'message': 'حذف شد'})
    except InstallmentPlan.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(description='گرفتن طرح اقساط یک شخص')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_person_installments(request):
    from .models import InstallmentPlan
    from .serializers import InstallmentPlanSerializer
    
    national_id = request.query_params.get('national_id', '').strip()
    person_name = request.query_params.get('person_name', '').strip()
    shop_id = request.query_params.get('shop_id', '')
    
    if national_id:
        plans = InstallmentPlan.objects.filter(seller=request.user, person_national_id=national_id)
        if shop_id and shop_id != 'all':
            plans = plans.filter(shop_id=shop_id)
    elif person_name:
        plans = InstallmentPlan.objects.filter(seller=request.user, person_name=person_name)
        if shop_id and shop_id != 'all':
            plans = plans.filter(shop_id=shop_id)
    else:
        return Response({'error': 'کد ملی یا نام الزامی'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'plans': InstallmentPlanSerializer(plans, many=True).data})

@extend_schema(description='ویرایش مبلغ اقساط')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_installment_amount(request, installment_id):
    """ویرایش مبلغ یک قسط"""
    from .models import Installment
    from .serializers import InstallmentSerializer
    try:
        inst = Installment.objects.get(id=installment_id, plan__seller=request.user)
    except Installment.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    if inst.is_paid:
        return Response({'error': 'قسط پرداخت‌شده قابل ویرایش نیست'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        new_amount = float(request.data.get('amount', 0))
    except (ValueError, TypeError):
        return Response({'error': 'مبلغ نامعتبر'}, status=status.HTTP_400_BAD_REQUEST)
    
    if new_amount <= 0:
        return Response({'error': 'مبلغ باید بیشتر از صفر باشد'}, status=status.HTTP_400_BAD_REQUEST)
    
    inst.amount = new_amount
    
    # ═══ آپدیت تاریخ ═══
    due_date_str = request.data.get('due_date_shamsi')
    if due_date_str:
        from apps.orders.views import to_gregorian_date
        from datetime import datetime as dt
        greg = to_gregorian_date(due_date_str)
        if greg and isinstance(greg, str):
            greg = dt.strptime(greg, '%Y-%m-%d').date()
        inst.due_date = greg
    
    inst.save()
    
    # آپدیت total_amount طرح
    plan = inst.plan
    from django.db.models import Sum
    total = plan.installments.aggregate(s=Sum('amount'))['s'] or 0
    plan.total_amount = total
    plan.save()
    
    return Response(InstallmentSerializer(inst).data)


@extend_schema(description='ویرایش مشخصات طرح')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_plan_person(request, plan_id):
    """ویرایش مشخصات فرد"""
    from .models import InstallmentPlan
    from .serializers import InstallmentPlanSerializer
    try:
        plan = InstallmentPlan.objects.get(id=plan_id, seller=request.user)
    except InstallmentPlan.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    # آپدیت فیلدهای مجاز
    allowed = ['person_name', 'person_phone', 'person_national_id', 'person_postal_code', 'person_address']
    for field in allowed:
        if field in request.data:
            setattr(plan, field, request.data[field])
    
    plan.save()
    return Response(InstallmentPlanSerializer(plan).data)
