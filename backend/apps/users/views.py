from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from .models import User, OTPCode, AbuseLog
from .serializers import RequestOTPSerializer, VerifyOTPSerializer


@extend_schema(request=RequestOTPSerializer, description='ارسال کد تأیید به شماره تلفن')
@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    serializer = RequestOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    phone = serializer.validated_data['phone']
    purpose = serializer.validated_data['purpose']
    
    if len(phone) != 11 or not phone.startswith('09'):
        return Response({'error': 'شماره تلفن نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # ====== لایه ضد تقلب ======
    if purpose == 'register':
        device_id = request.data.get('device_id')
        ip_address = request.META.get('REMOTE_ADDR', '0.0.0.0')
        
        risk_score, factors = AbuseLog.calculate_risk(
            device_id=device_id,
            browser_id=None,
            ip_address=ip_address,
            phone=phone,
        )
        
        if risk_score >= 80:
            return Response(
                {'error': 'ثبت‌نام شما به دلیل الگوی استفاده مشکوک امکان‌پذیر نیست.'},
                status=status.HTTP_403_FORBIDDEN
            )
    # ===========================
    
    if purpose == 'register' and User.objects.filter(phone=phone).exists():
        return Response({'error': 'این شماره قبلاً ثبت‌نام کرده است.'}, status=status.HTTP_409_CONFLICT)
    
    if purpose == 'login' and not User.objects.filter(phone=phone).exists():
        return Response({'error': 'کاربری با این شماره یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    otp = OTPCode.generate(phone, purpose)
    
    return Response({
        'message': 'کد تأیید ارسال شد.',
        'code': otp.code,
        'expires_at': otp.expires_at,
    })


@extend_schema(request=VerifyOTPSerializer, description='تأیید کد و ثبت‌نام/ورود')
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    serializer = VerifyOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    phone = serializer.validated_data['phone']
    code = serializer.validated_data['code']
    purpose = serializer.validated_data['purpose']
    user_type = serializer.validated_data['user_type']
    
    try:
        otp = OTPCode.objects.filter(
            phone=phone, purpose=purpose, is_used=False, expires_at__gt=timezone.now()
        ).latest('created_at')
    except OTPCode.DoesNotExist:
        return Response({'error': 'کد نامعتبر یا منقضی شده است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if otp.code != code:
        return Response({'error': 'کد اشتباه است.'}, status=status.HTTP_400_BAD_REQUEST)
    
    otp.is_used = True
    otp.save()
    
    if purpose == 'register':
        user = User.objects.create_user(
            username=phone,
            phone=phone,
            user_type=user_type,
            trial_used=True,
            subscription_plan='free',
            subscription_start=timezone.now(),
            subscription_expiry=timezone.now() + timezone.timedelta(days=14),
        )
        
        # ثبت لاگ امنیتی
        AbuseLog.objects.create(
            user=user,
            phone=phone,
            device_id=request.data.get('device_id'),
            ip_address=request.META.get('REMOTE_ADDR', '0.0.0.0'),
            risk_score=0,
            action_taken='allowed',
        )
        
        message = 'ثبت‌نام با موفقیت انجام شد.'
    elif purpose == 'login':
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response({'error': 'کاربری یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        
        # بررسی مسدودیت
        if user.is_blocked:
            return Response(
                {'error': f'حساب شما مسدود شده است. دلیل: {user.blocked_reason}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message = 'ورود با موفقیت انجام شد.'
    
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': message,
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'user': {
            'id': user.id,
            'phone': user.phone,
            'user_type': user.user_type,
            'subscription_plan': user.subscription_plan,
            'subscription_expiry': user.subscription_expiry,
        }
    })


@extend_schema(description='دریافت اطلاعات کاربر لاگین‌کرده')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    from .serializers import UserSerializer
    user = request.user
    data = UserSerializer(user).data
    # فیلدهای اشتراک
    data['subscription_expiry'] = user.subscription_expiry
    data['subscription_active'] = user.subscription_active
    data['monthly_order_limit'] = user.monthly_order_limit
    data['monthly_product_limit'] = user.monthly_product_limit
    data['monthly_service_limit'] = user.monthly_service_limit
    data['is_staff'] = user.is_staff
    return Response(data)

# ═══════════════════════════════════════════════════════════
# پروفایل خریدار
# ═══════════════════════════════════════════════════════════

@extend_schema(description='دریافت پروفایل')
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """GET: دریافت، PATCH: ویرایش"""
    from .serializers import UserSerializer
    
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    
    try:
        # آواتار
        if 'avatar' in request.FILES:
            request.user.avatar = request.FILES['avatar']
        
        # فیلدهای متنی
        for field in ['first_name', 'last_name', 'email']:
            if field in request.data:
                setattr(request.user, field, request.data[field] or '')
        
        # national_id — باید None باشه اگه خالی
        if 'national_id' in request.data:
            nid = request.data['national_id']
            if nid and len(str(nid)) == 10:
                # چک تکراری
                from .models import User
                existing = User.objects.filter(national_id=nid).exclude(id=request.user.id).first()
                if existing:
                    return Response({'error': 'این کد ملی قبلاً ثبت شده'}, status=status.HTTP_400_BAD_REQUEST)
                request.user.national_id = nid
            else:
                request.user.national_id = None
        
        # birthday
        if 'birthday' in request.data:
            bd = request.data['birthday']
            if bd:
                from datetime import datetime
                try:
                    request.user.birthday = datetime.strptime(bd, '%Y-%m-%d').date()
                except:
                    pass
            else:
                request.user.birthday = None
        
        request.user.save()
        return Response(UserSerializer(request.user).data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='لیست آدرس‌ها')
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def address_list(request):
    """GET: لیست، POST: افزودن"""
    from .models import Address
    from .serializers import AddressSerializer
    
    if request.method == 'GET':
        addresses = Address.objects.filter(user=request.user)
        return Response(AddressSerializer(addresses, many=True).data)
    
    # POST
    serializer = AddressSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='ویرایش/حذف آدرس')
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def address_detail(request, address_id):
    from .models import Address
    from .serializers import AddressSerializer
    
    try:
        address = Address.objects.get(id=address_id, user=request.user)
    except Address.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        address.delete()
        return Response({'message': 'حذف شد'})
    
    # PATCH
    serializer = AddressSerializer(address, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='لیست علاقه‌مندی‌ها')
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def favorite_list(request):
    """GET: لیست، POST: افزودن"""
    from .models import Favorite
    from .serializers import FavoriteSerializer
    
    if request.method == 'GET':
        favorites = Favorite.objects.filter(user=request.user).select_related('product')
        return Response(FavoriteSerializer(favorites, many=True).data)
    
    # POST
    product_id = request.data.get('product')
    if not product_id:
        return Response({'error': 'product الزامی'}, status=status.HTTP_400_BAD_REQUEST)
    
    fav, created = Favorite.objects.get_or_create(user=request.user, product_id=product_id)
    if created:
        return Response(FavoriteSerializer(fav).data, status=status.HTTP_201_CREATED)
    return Response({'error': 'قبلاً اضافه شده'}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(description='حذف علاقه‌مندی')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def favorite_delete(request, product_id):
    from .models import Favorite
    
    try:
        fav = Favorite.objects.get(user=request.user, product_id=product_id)
        fav.delete()
        return Response({'message': 'حذف شد'})
    except Favorite.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(description='اطلاعات کیف پول')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_info(request):
    from .models import Wallet
    from .serializers import WalletSerializer
    
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    return Response(WalletSerializer(wallet).data)

# ═══════════════════════════════════════════════════════════
# نوتیفیکیشن‌ها
# ═══════════════════════════════════════════════════════════

@extend_schema(description='لیست نوتیفیکیشن‌ها')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    from .models import Notification
    from .serializers import NotificationSerializer
    
    notifs = Notification.objects.filter(user=request.user)[:50]
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    
    return Response({
        'notifications': NotificationSerializer(notifs, many=True).data,
        'unread_count': unread_count,
    })


@extend_schema(description='تعداد خوانده‌نشده‌ها')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    from .models import Notification
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


@extend_schema(description='خواندن نوتیفیکیشن')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, notif_id):
    from .models import Notification
    from .serializers import NotificationSerializer
    
    try:
        notif = Notification.objects.get(id=notif_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
    
    notif.is_read = True
    notif.save()
    return Response(NotificationSerializer(notif).data)


@extend_schema(description='خواندن همه نوتیفیکیشن‌ها')
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def notification_mark_all_read(request):
    from .models import Notification
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'همه خوانده شدند'})


@extend_schema(description='حذف نوتیفیکیشن')
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def notification_delete(request, notif_id):
    from .models import Notification
    try:
        notif = Notification.objects.get(id=notif_id, user=request.user)
        notif.delete()
        return Response({'message': 'حذف شد'})
    except Notification.DoesNotExist:
        return Response({'error': 'یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
