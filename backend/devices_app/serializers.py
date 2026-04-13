from django.conf import settings
from rest_framework import serializers
from monitoring_app.models import Threshold
from .models import Device, DeviceType


class DeviceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceType
        fields = '__all__'


class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()
    type_name = serializers.SerializerMethodField()
    threshold_data = serializers.SerializerMethodField()
    is_sensor = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'device_id',
            'device_name',
            'type',
            'type_name',
            'is_sensor',
            'room',
            'room_name',
            'floor_name',
            'status',
            'brightness',
            'threshold',
            'threshold_data',
            'created_at',
        ]

    def get_room_name(self, obj):
        return obj.room.room_name if obj.room else None

    def get_floor_name(self, obj):
        if obj.room and obj.room.floor:
            return obj.room.floor.floor_name
        return None

    def get_type_name(self, obj):
        return obj.type.name_type if obj.type else None

    def get_is_sensor(self, obj):
        """
        Explicitly marks a device as sensor/actuator.
        For ambiguous types like 'light', use COREIOT settings to distinguish.
        """
        type_name = (obj.type.name_type if obj.type else '').lower()
        # Pure sensor/actuator types
        if type_name in ('temperature', 'humidity', 'motion', 'sensor'):
            return True
        if type_name in ('fan', 'door', 'actuator'):
            return False
        # Ambiguous 'light' type: check COREIOT sensor ID list
        sensor_ids = [
            str(getattr(settings, 'COREIOT_LOCAL_LIGHT_SENSOR_ID', '')).strip(),
            str(getattr(settings, 'COREIOT_LOCAL_TEMPERATURE_SENSOR_ID', '')).strip(),
            str(getattr(settings, 'COREIOT_LOCAL_HUMIDITY_SENSOR_ID', '')).strip(),
            str(getattr(settings, 'COREIOT_LOCAL_MOTION_SENSOR_ID', '')).strip(),
        ]
        sensor_ids = [sid for sid in sensor_ids if sid]
        if str(obj.device_id) in sensor_ids:
            return True
        # Fallback: has threshold → treat as sensor
        return bool(obj.threshold)

    def get_threshold_data(self, obj):
        if not obj.threshold:
            return None
        return {
            'threshold_id': obj.threshold.threshold_id,
            'min_value': obj.threshold.min_value,
            'max_value': obj.threshold.max_value,
            'require_motion': obj.threshold.require_motion,
        }

    def create(self, validated_data):
        threshold_payload = self.initial_data.get('threshold_data') or {}
        device = super().create(validated_data)
        self._upsert_threshold(device, threshold_payload)
        return device

    def update(self, instance, validated_data):
        threshold_payload = self.initial_data.get('threshold_data')
        device = super().update(instance, validated_data)
        if threshold_payload is not None:
            self._upsert_threshold(device, threshold_payload)
        return device

    def _upsert_threshold(self, device, payload):
        if not isinstance(payload, dict):
            return
        min_value = payload.get('min_value')
        max_value = payload.get('max_value')
        require_motion = payload.get('require_motion', True)
        if min_value in (None, '') and max_value in (None, ''):
            old_threshold_id = device.threshold_id
            if old_threshold_id:
                device.threshold = None
                device.save(update_fields=['threshold'])
                # Remove orphan threshold if no devices use it.
                if not Device.objects.filter(threshold_id=old_threshold_id).exists():
                    Threshold.objects.filter(threshold_id=old_threshold_id).delete()
            return

        if not device.threshold_id:
            threshold = Threshold.objects.create(
                min_value=min_value,
                max_value=max_value,
                require_motion=require_motion,
            )
            device.threshold = threshold
            device.save(update_fields=['threshold'])
        else:
            Threshold.objects.filter(threshold_id=device.threshold_id).update(
                min_value=min_value,
                max_value=max_value,
                require_motion=require_motion,
            )


