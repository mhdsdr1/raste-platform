from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.db import transaction

from .models import Wallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer, ChargeWalletSerializer, WithdrawSerializer


@extend_schema(description='مشاهده کیف پول من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_wallet(request):
    """اطلاعات کیف پول کاربر"""
    wallet, created = Wallet.objects.get_or_create(user=request.user)
    return Response(WalletSerializer(wallet).data)


@extend_schema(description='تاریخچه تراکنش‌های من')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_transactions(request):
    """تاریخچه تراکنش‌های کیف پول"""
    wallet = Wallet.objects.filter(user=request.user).first()
    if not wallet:
        return Response([])
    
    tx_type = request.query_params.get('type')
    transactions = wallet.transactions.all()
    if tx_type:
        transactions = transactions.filter(transaction_type=tx_type)
    
    return Response(WalletTransactionSerializer(transactions, many=True).data)


@extend_schema(
    description='شارژ کیف پول (شبیه‌سازی)',
    request=ChargeWalletSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def charge_wallet(request):
    """شارژ کیف پول"""
    serializer = ChargeWalletSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    amount = serializer.validated_data['amount']
    
    wallet, created = Wallet.objects.select_for_update().get_or_create(user=request.user)
    wallet.balance += amount
    wallet.save()
    
    # ثبت تراکنش
    WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type='deposit',
        amount=amount,
        balance_after=wallet.balance,
        description=f'شارژ کیف پول - {amount:,} تومان',
    )
    
    return Response({
        'message': f'{amount:,} تومان به کیف پول شما اضافه شد.',
        'wallet': WalletSerializer(wallet).data
    })


@extend_schema(
    description='برداشت از کیف پول',
    request=WithdrawSerializer
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def withdraw(request):
    """برداشت وجه از کیف پول"""
    serializer = WithdrawSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    amount = serializer.validated_data['amount']
    
    try:
        wallet = Wallet.objects.select_for_update().get(user=request.user)
    except Wallet.DoesNotExist:
        return Response({'error': 'کیف پول یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
    
    if wallet.available_balance < amount:
        return Response({'error': 'موجودی کافی نیست.'}, status=status.HTTP_400_BAD_REQUEST)
    
    wallet.balance -= amount
    wallet.save()
    
    WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type='withdraw',
        amount=-amount,
        balance_after=wallet.balance,
        description=f'برداشت {amount:,} تومان - درخواست تسویه',
    )
    
    return Response({
        'message': f'{amount:,} تومان از کیف پول شما برداشت شد.',
        'wallet': WalletSerializer(wallet).data
    })
