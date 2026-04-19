from django.contrib import admin
from .models import IoTToken


@admin.register(IoTToken)
class IoTTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'device', 'label', 'is_active', 'last_seen', 'created_at', 'token_preview')
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    search_fields = ('device__device_name', 'label')
    readonly_fields = ('token', 'last_seen', 'created_at')

    def token_preview(self, obj):
        return f'{obj.token[:12]}...'
    token_preview.short_description = 'Token'
