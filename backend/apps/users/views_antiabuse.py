from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.utils import timezone

from .models import AbuseLog, User


@extend_schema(description='گزارش اطلاعات دستگاه برای ضد تقلب')
@api_view(['POST'])
@permission_classes([AllowAny])
def report_device(request):
    """گزارش Fingerprint دستگاه (قبل از ثبت‌نام)"""
    device_id = request.data.get('device_id')
    browser_id = request.data.get('browser_id')
    ip_address = request.META.get('REMOTE_ADDR', '0.0.0.0')
    phone = request.data.get('phone')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    device_type = request.data.get('device_type', 'modern')
    
    # محاسبه ریسک
    risk_score, factors = AbuseLog.calculate_risk(
        device_id=device_id,
        browser_id=browser_id,
        ip_address=ip_address,
        phone=phone,
        device_type=device_type,
    )
    
    level, label = AbuseLog.get_risk_level(risk_score)
    
    # ذخیره لاگ
    abuse_log = AbuseLog.objects.create(
        phone=phone,
        device_id=device_id,
        browser_id=browser_id,
        ip_address=ip_address,
        user_agent=user_agent,
        device_type=device_type,
        risk_score=risk_score,
        risk_factors=factors,
        is_vpn=False,  # TODO: چک واقعی VPN
        is_rapid_signup=factors.get('rapid_signup', 0) > 0,
        multiple_accounts_count=AbuseLog.objects.filter(device_id=device_id).count() if device_id else 0,
    )
    
    # تصمیم‌گیری
    if risk_score >= 80:
        abuse_log.action_taken = 'blocked'
        abuse_log.save()
        return Response({
            'allowed': False,
            'risk_score': risk_score,
            'risk_level': level,
            'risk_label': label,
            'message': 'حساب شما به دلیل الگوی استفاده مشکوک مسدود شد. لطفاً با پشتیبانی تماس بگیرید.',
            'factors': factors,
        }, status=status.HTTP_403_FORBIDDEN)
    
    elif risk_score >= 60:
        abuse_log.action_taken = 'verified'
        abuse_log.save()
        return Response({
            'allowed': True,
            'require_verification': True,
            'risk_score': risk_score,
            'risk_level': level,
            'risk_label': label,
            'message': 'لطفاً کد ملی خود را وارد کنید.',
            'factors': factors,
        })
    
    else:
        abuse_log.action_taken = 'allowed'
        abuse_log.save()
        return Response({
            'allowed': True,
            'require_verification': False,
            'risk_score': risk_score,
            'risk_level': level,
            'risk_label': label,
            'message': 'تأیید شد.',
            'factors': factors,
        })


@extend_schema(description='لیست لاگ‌های امنیتی (ادمین)')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def abuse_logs(request):
    """مشاهده لاگ‌های امنیتی (فقط ادمین)"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی غیرمجاز.'}, status=status.HTTP_403_FORBIDDEN)
    
    # فیلترها
    min_risk = request.query_params.get('min_risk')
    action = request.query_params.get('action')
    
    logs = AbuseLog.objects.all()
    if min_risk:
        logs = logs.filter(risk_score__gte=int(min_risk))
    if action:
        logs = logs.filter(action_taken=action)
    
    logs = logs[:100]  # حداکثر ۱۰۰ تا
    
    return Response([{
        'id': log.id,
        'phone': log.phone,
        'device_id': log.device_id[:20] if log.device_id else '',
        'ip_address': log.ip_address,
        'risk_score': log.risk_score,
        'risk_level': AbuseLog.get_risk_level(log.risk_score)[0],
        'risk_factors': log.risk_factors,
        'action_taken': log.action_taken,
        'is_vpn': log.is_vpn,
        'is_emulator': log.is_emulator,
        'created_at': log.created_at,
    } for log in logs])


@extend_schema(description='بررسی سریع ریسک یک کاربر')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_risk(request, user_id):
    """بررسی ریسک یک کاربر خاص"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی غیرمجاز.'}, status=status.HTTP_403_FORBIDDEN)
    
    logs = AbuseLog.objects.filter(user_id=user_id).order_by('-created_at')[:5]
    if not logs:
        return Response({'risk': 'unknown', 'message': 'اطلاعاتی یافت نشد.'})
    
    latest = logs[0]
    return Response({
        'user_id': user_id,
        'latest_risk_score': latest.risk_score,
        'latest_risk_level': AbuseLog.get_risk_level(latest.risk_score)[0],
        'total_logs': AbuseLog.objects.filter(user_id=user_id).count(),
        'recent_logs': [{
            'risk_score': log.risk_score,
            'action': log.action_taken,
            'date': log.created_at,
        } for log in logs],
    })
