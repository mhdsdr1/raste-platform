from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.utils import timezone

from .models import GroupDeal, GroupDealParticipant
from .serializers import (
    GroupDealCreateSerializer, GroupDealSerializer, ParticipantSerializer
)


@extend_schema(
    description='ایجاد هم‌خرید جدید',
    request=GroupDealCreateSerializer,
    responses=GroupDealSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_deal(request):
    """ایجاد هم‌خرید (فقط پلن طلایی)"""
    user = request.user
    
    # بررسی پلن
    if user.subscription_plan != 'gold':
        return Response(
            {'error': 'ایجاد هم‌خرید فقط با پلن طلایی امکان‌پذیر است.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = GroupDealCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # محاسبه deadline
    deadline = timezone.now() + timezone.timedelta(hours=data['deadline_hours'])
    
    deal = GroupDeal.objects.create(
        deal_maker=user,
        title=data['title'],
        description=data['description'],
        market_price=data['market_price'],
        wholesale_price=data['wholesale_price'],
        min_participants=data['min_participants'],
        payment_type=data['payment_type'],
        deposit_percent=data['deposit_percent'],
        deadline=deadline,
        slug=data['slug'],
    )
    
    return Response(GroupDealSerializer(deal).data, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست هم‌خریدهای فعال')
@api_view(['GET'])
def list_deals(request):
    """لیست هم‌خریدهای فعال"""
    deals = GroupDeal.objects.filter(
        status='active',
        deadline__gt=timezone.now()
    ).order_by('-created_at')
    
    return Response(GroupDealSerializer(deals, many=True).data)


@extend_schema(description='جزئیات هم‌خرید')
@api_view(['GET'])
def deal_detail(request, slug):
    """جزئیات یک هم‌خرید"""
    try:
        deal = GroupDeal.objects.get(slug=slug)
    except GroupDeal.DoesNotExist:
        return Response({'error': 'هم‌خرید یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response(GroupDealSerializer(deal).data)


@extend_schema(
    description='ثبت‌نام در هم‌خرید',
    request=ParticipantSerializer
)
@api_view(['POST'])
def join_deal(request, slug):
    """ثبت‌نام در هم‌خرید"""
    try:
        deal = GroupDeal.objects.get(slug=slug)
    except GroupDeal.DoesNotExist:
        return Response({'error': 'هم‌خرید یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    # بررسی وضعیت
    if deal.status != 'active':
        return Response({'error': 'این هم‌خرید دیگر فعال نیست.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if deal.is_expired:
        deal.status = 'cancelled'
        deal.save()
        return Response({'error': 'مهلت هم‌خرید به پایان رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if deal.current_participants >= deal.min_participants:
        return Response({'error': 'ظرفیت تکمیل شده است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ParticipantSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # بررسی تکراری نبودن
    if GroupDealParticipant.objects.filter(
        group_deal=deal,
        guest_phone=data['guest_phone']
    ).exists():
        return Response(
            {'error': 'شما قبلاً در این هم‌خرید ثبت‌نام کرده‌اید.'},
            status=status.HTTP_409_CONFLICT
        )
    
    # ایجاد شرکت‌کننده
    participant = GroupDealParticipant.objects.create(
        group_deal=deal,
        guest_name=data['guest_name'],
        guest_phone=data['guest_phone'],
        amount_paid=deal.calculated_price,
        payment_status='paid'  # TODO: بعداً با درگاه واقعی
    )
    
    # افزایش تعداد
    deal.current_participants += 1
    
    # بررسی تکمیل
    if deal.current_participants >= deal.min_participants:
        deal.status = 'completed'
    
    deal.save()
    
    return Response({
        'message': 'ثبت‌نام با موفقیت انجام شد.',
        'participant_id': participant.id,
        'deal': GroupDealSerializer(deal).data
    }, status=status.HTTP_201_CREATED)


@extend_schema(description='لیست هم‌خریدهای من (واسط)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_deals(request):
    """لیست هم‌خریدهای کاربر"""
    deals = GroupDeal.objects.filter(deal_maker=request.user)
    return Response(GroupDealSerializer(deals, many=True).data)
