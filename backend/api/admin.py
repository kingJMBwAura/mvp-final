from django.contrib import admin
from .models import Account, Watch, Cart, Order


class AccountAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'user_name', 'created_at']
    search_fields = ['user_name']
    readonly_fields = ['created_at', 'updated_at']


class WatchAdmin(admin.ModelAdmin):
    list_display = ['watch_id', 'brand', 'watch_name', 'sale_price', 'seller']
    search_fields = ['brand', 'watch_name', 'listing_code']
    list_filter = ['condition', 'brand', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


class CartAdmin(admin.ModelAdmin):
    list_display = ['cart_id', 'buyer', 'date_added']
    readonly_fields = ['date_added', 'created_at', 'updated_at']


class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'buyer', 'total_price', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


admin.site.register(Account, AccountAdmin)
admin.site.register(Watch, WatchAdmin)
admin.site.register(Cart, CartAdmin)
admin.site.register(Order, OrderAdmin)
