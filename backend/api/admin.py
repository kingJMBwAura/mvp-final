from django.contrib import admin
from .models import Account, Watch, Cart, Order, PromoCode, PromoCodeUsage


class AccountAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'user_name', 'created_at']
    search_fields = ['user_name']
    readonly_fields = ['created_at', 'updated_at']


class WatchAdmin(admin.ModelAdmin):
    list_display = ['watch_id', 'brand', 'watch_name', 'sale_price', 'seller', 'availability']
    search_fields = ['brand', 'watch_name', 'reference_number']
    list_filter = ['availability', 'condition', 'brand', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


class CartAdmin(admin.ModelAdmin):
    list_display = ['cart_id', 'buyer', 'date_added']
    readonly_fields = ['date_added', 'created_at', 'updated_at']


class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'buyer', 'total_price', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'discount_value', 'usage_type', 'uses_count', 'is_active', 'expiry_date']
    search_fields = ['code']
    list_filter = ['discount_type', 'usage_type', 'is_active']
    filter_horizontal = ['allowed_accounts']
    readonly_fields = ['uses_count', 'created_at', 'updated_at']


class PromoCodeUsageAdmin(admin.ModelAdmin):
    list_display = ['promo_code', 'account', 'uses_count', 'updated_at']
    search_fields = ['promo_code__code', 'account__user_name']
    readonly_fields = ['created_at', 'updated_at']


admin.site.register(Account, AccountAdmin)
admin.site.register(Watch, WatchAdmin)
admin.site.register(Cart, CartAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(PromoCode, PromoCodeAdmin)
admin.site.register(PromoCodeUsage, PromoCodeUsageAdmin)
