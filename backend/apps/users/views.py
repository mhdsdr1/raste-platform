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
    user = request.user
    return Response({
        'id': user.id,
        'phone': user.phone,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'user_type': user.user_type,
        'subscription_plan': user.subscription_plan,
        'subscription_expiry': user.subscription_expiry,
        'subscription_active': user.subscription_active,
        'monthly_order_limit': user.monthly_order_limit,
        'monthly_product_limit': user.monthly_product_limit,
        'monthly_service_limit': user.monthly_service_limit,
        'is_blocked': user.is_blocked,
    })
