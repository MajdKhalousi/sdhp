import type { VitalsPayload } from '@/types/encounter';

interface VitalsFormProps {
  vitals: VitalsPayload;
  onChange: (vitals: VitalsPayload) => void;
  disabled?: boolean;
}

const VITALS_FIELDS: { key: keyof VitalsPayload; label: string; placeholder: string; unit: string }[] = [
  { key: 'temperature',      label: 'Temperature',       placeholder: '37.0',    unit: '°C'         },
  { key: 'bloodPressure',    label: 'Blood Pressure',    placeholder: '120/80',  unit: 'mmHg'       },
  { key: 'heartRate',        label: 'Heart Rate',        placeholder: '72',      unit: 'bpm'        },
  { key: 'oxygenSaturation', label: 'O₂ Saturation',    placeholder: '98',      unit: '%'          },
  { key: 'respiratoryRate',  label: 'Respiratory Rate',  placeholder: '16',      unit: 'breaths/min'},
  { key: 'weight',           label: 'Weight',            placeholder: '70',      unit: 'kg'         },
  { key: 'height',           label: 'Height',            placeholder: '170',     unit: 'cm'         },
];

export function VitalsForm({ vitals, onChange, disabled }: VitalsFormProps) {
  function handleChange(key: keyof VitalsPayload, value: string) {
    onChange({ ...vitals, [key]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {VITALS_FIELDS.map(({ key, label, placeholder, unit }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`vital-${key}`}>
            {label}
          </label>
          <div className="relative">
            <input
              id={`vital-${key}`}
              type="text"
              dir="ltr"
              value={vitals[key] ?? ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-8 w-full rounded-md border bg-background px-2.5 pe-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
