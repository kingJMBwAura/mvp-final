from django.db import models
from django.conf import settings

# Create your models here.
class Account(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    user_name = models.CharField(max_length=255)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.user_name


class Watch(models.Model):
    # use default `id` primary key instead of an invalid ForeignKey usage
    watch_id = models.AutoField(primary_key=True)
    brand = models.CharField(max_length=255)
    watch_name = models.CharField(max_length=255)
    
    condition = models.CharField(max_length=255)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    seller = models.ForeignKey(Account, on_delete=models.CASCADE)
    reference_number = models.CharField(max_length=50, blank=True, null=True)
    movement = models.CharField(max_length=100, blank=True, null=True)
    case_material = models.CharField(max_length=100, blank=True, null=True)
    bracelet_material = models.CharField(max_length=100, blank=True, null=True)
    year_of_production = models.PositiveIntegerField(blank=True, null=True)
    gender = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    availability = models.CharField(max_length=50, blank=True, null=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=10, blank=True, null=True)
    negotiable = models.BooleanField(default=False)
    image = models.ImageField(upload_to='watches/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.watch_name

class Cart(models.Model):
    cart_id = models.AutoField(primary_key=True)
    date_added = models.DateTimeField(auto_now_add=True)
    items = models.ManyToManyField(Watch, blank=True, related_name='carts')
    buyer = models.ForeignKey(Account, on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.cart_id)

class Order(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    order_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=255, default="Guest Customer")
    delivery_method = models.CharField(max_length=100, default="Standard")
    payment_method = models.CharField(max_length=100, default="Credit Card")
    
    watches = models.ManyToManyField(Watch, related_name='orders')
    buyer = models.ForeignKey(Account, on_delete=models.CASCADE)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Payment details
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Shipping address
    shipping_address_line_1 = models.CharField(max_length=255)
    shipping_address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    shipping_city = models.CharField(max_length=100)
    shipping_region = models.CharField(max_length=100)
    shipping_zip_code = models.CharField(max_length=20)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.order_id)


class PromoCode(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    USAGE_TYPE_CHOICES = [
        ('universal', 'Universal Count'),
        ('per_account', 'Per Account Limit'),
        ('restricted', 'Restricted to Specific Accounts'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    usage_type = models.CharField(max_length=20, choices=USAGE_TYPE_CHOICES, default='universal')
    
    # For universal usage
    max_uses = models.PositiveIntegerField(blank=True, null=True)
    uses_count = models.PositiveIntegerField(default=0)
    
    # For per_account usage - max uses per individual account
    max_uses_per_account = models.PositiveIntegerField(blank=True, null=True)
    
    # For restricted or per_account tracking - which accounts can use it
    allowed_accounts = models.ManyToManyField(Account, blank=True, related_name='promo_codes')
    
    is_active = models.BooleanField(default=True)
    expiry_date = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.code


class PromoCodeUsage(models.Model):
    promo_code = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name='usage_records')
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    uses_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('promo_code', 'account')
    
    def __str__(self):
        return f"{self.promo_code.code} - {self.account.user_name}"
    
class WatchMarketData(models.Model):
    watch = models.OneToOneField(Watch, on_delete=models.CASCADE, related_name='market_data')
    external_id = models.IntegerField(blank=True, null=True)
    market_price_eur = models.CharField(max_length=50, blank=True, null=True)
    movement = models.CharField(max_length=255, blank=True, null=True)
    family_name = models.CharField(max_length=255, blank=True, null=True)
    year_produced = models.CharField(max_length=100, blank=True, null=True)
    function_name = models.CharField(max_length=255, blank=True, null=True)
    limited = models.CharField(max_length=10, blank=True, null=True)
    external_image = models.CharField(max_length=500, blank=True, null=True)
    fetched_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Market data for {self.watch.watch_name}"