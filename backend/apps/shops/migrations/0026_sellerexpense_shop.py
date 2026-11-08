# این migration عمداً خالی است.
# فیلد shop روی SellerExpense در مدل تعریف شده ولی هیچ‌جا استفاده نمی‌شود.
# برای جلوگیری از مزاحمت makemigrations، این migration خالی ساخته شد.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0025_product_delete_reason_product_deleted_at_and_more'),
    ]

    operations = []
