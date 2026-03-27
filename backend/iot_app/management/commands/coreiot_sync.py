from django.core.management.base import BaseCommand

from iot_app.coreiot_sync import run_forever, sync_once


class Command(BaseCommand):
    help = "Synchronize telemetry from CoreIoT to local backend"

    def add_arguments(self, parser):
        parser.add_argument(
            "--once",
            action="store_true",
            help="Run one synchronization cycle and exit",
        )

    def handle(self, *args, **options):
        if options.get("once"):
            ok = sync_once()
            if ok:
                self.stdout.write(self.style.SUCCESS("CoreIoT sync once completed"))
            else:
                self.stdout.write(self.style.WARNING("CoreIoT sync once had no data or config missing"))
            return

        self.stdout.write(self.style.SUCCESS("Starting CoreIoT sync loop. Press Ctrl+C to stop."))
        run_forever()
