from rest_framework import serializers
from monitoring_app.models import Threshold
from .models import Device, Sensor


class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()
    threshold = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'device_id',
            'device_name',
            'device_type',
            'device_subtype',
            'room',
            'room_name',
            'floor_name',
            'status',
            'description',
            'unit',
            'current_value',
            'last_reading_at',
            'threshold',
            'created_at',
            'updated_at',
        ]

    def get_room_name(self, obj):
        return obj.room.room_name if obj.room else None

    def get_floor_name(self, obj):
        if obj.room and obj.room.floor:
            return obj.room.floor.floor_name
        return None

    def get_threshold(self, obj):
        threshold = getattr(obj, 'threshold', None)
        if not threshold:
            return None
        return {
            'threshold_id': threshold.threshold_id,
            'min_value': threshold.min_value,
            'max_value': threshold.max_value,
            'trigger_action': threshold.trigger_action,
            'target_device': threshold.target_device_id,
            'target_device_name': threshold.target_device.device_name if threshold.target_device else None,
        }

    def create(self, validated_data):
        threshold_payload = self.initial_data.get('threshold') or {}
        device = super().create(validated_data)
        self._upsert_threshold(device, threshold_payload)
        return device

    def update(self, instance, validated_data):
        threshold_payload = self.initial_data.get('threshold')
        device = super().update(instance, validated_data)
        if threshold_payload is not None:
            self._upsert_threshold(device, threshold_payload)
        return device

    def _upsert_threshold(self, device, payload):
        if device.device_type != Device.TYPE_SENSOR:
            Threshold.objects.filter(device=device).delete()
            return
        if not isinstance(payload, dict):
            return
        min_value = payload.get('min_value')
        max_value = payload.get('max_value')
        trigger_action = payload.get('trigger_action', Threshold.ACTION_NONE)
        target_device_id = payload.get('target_device')
        if min_value in (None, '') and max_value in (None, '') and trigger_action == Threshold.ACTION_NONE and not target_device_id:
            Threshold.objects.filter(device=device).delete()
            return
        Threshold.objects.update_or_create(
            device=device,
            defaults={
                'min_value': min_value,
                'max_value': max_value,
                'trigger_action': trigger_action,
                'target_device_id': target_device_id,
            },
        )


class SensorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sensor
        fields = '__all__'
