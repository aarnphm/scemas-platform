// AuthorizeIoTDevices admin page: manage registered IoT sensor devices

import type { Metadata } from 'next'
import { DevicesManager } from '@/components/admin/devices-manager'

export const metadata: Metadata = { title: 'devices' }

export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">devices</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          register, update, and revoke IoT sensor devices. bulk provisioning runs at server startup
          from the sensor catalog. individual devices can be managed here.
        </p>
      </div>
      <DevicesManager />
    </div>
  )
}
