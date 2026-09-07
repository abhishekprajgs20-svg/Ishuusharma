'use client';

import { useTestStore } from '@/store/testStore';
import { Field, FieldRow, TextInput, SectionCard, Toggle, ColorInput, ImageDropZone } from '../ui';
import { secondaryFontCssFamily } from '@/lib/googleFont';

export default function BrandingPanel() {
  const branding = useTestStore((s) => s.doc.branding);
  const updateBranding = useTestStore((s) => s.updateBranding);
  const layout = useTestStore((s) => s.doc.layout);
  const secondaryLabel = layout.secondaryLanguageLabel || 'Secondary';
  const secondaryFontStyle =
    layout.secondaryFontChoice === 'same-as-primary'
      ? undefined
      : { fontFamily: secondaryFontCssFamily(layout.secondaryFontChoice, layout.secondaryCustomFontName, '') };

  return (
    <div>
      <SectionCard title="Institute Identity">
        <FieldRow>
          <Field label="Institute / Brand Name (Primary)">
            <TextInput value={branding.instituteName} onChange={(e) => updateBranding({ instituteName: e.target.value })} />
          </Field>
          <Field label={`Institute Name (${secondaryLabel})`}>
            <TextInput
              style={secondaryFontStyle}
              value={branding.instituteNameHi || ''}
              onChange={(e) => updateBranding({ instituteNameHi: e.target.value })}
            />
          </Field>
        </FieldRow>
        <Field label="Tagline">
          <TextInput value={branding.tagline || ''} onChange={(e) => updateBranding({ tagline: e.target.value })} />
        </Field>
        <Field label="Logo & Watermark" hint="These also have quick-upload shortcuts in the header at the top of the screen">
          <div className="grid grid-cols-2 gap-3">
            <ImageDropZone label="Logo" value={branding.logoDataUrl} onChange={(v) => updateBranding({ logoDataUrl: v })} />
            <ImageDropZone
              label="Watermark"
              value={branding.watermarkDataUrl}
              onChange={(v) => updateBranding({ watermarkDataUrl: v })}
            />
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Contact & Footer Info">
        <Field label="Address / Contact Line">
          <TextInput value={branding.address || ''} onChange={(e) => updateBranding({ address: e.target.value })} />
        </Field>
        <FieldRow>
          <Field label="Website">
            <TextInput value={branding.website || ''} onChange={(e) => updateBranding({ website: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={branding.phone || ''} onChange={(e) => updateBranding({ phone: e.target.value })} />
          </Field>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Appearance">
        <Field label="Accent Color" hint="Used for headings, correct-answer highlights, badges — also editable from the header swatch">
          <ColorInput value={branding.accentColor} onChange={(v) => updateBranding({ accentColor: v })} />
        </Field>
        <Field label="Watermark Opacity">
          <input
            type="range"
            min={0}
            max={0.3}
            step={0.01}
            value={branding.watermarkOpacity}
            onChange={(e) => updateBranding({ watermarkOpacity: Number(e.target.value) })}
            className="w-full accent-brand-500"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Cover Page Elements">
        <FieldRow>
          <Toggle
            label="Show Roll Number Grid"
            checked={branding.showRollNoGrid}
            onChange={(v) => updateBranding({ showRollNoGrid: v })}
          />
          <Toggle
            label="Show Signature Boxes"
            checked={branding.showSignatureBox}
            onChange={(v) => updateBranding({ showSignatureBox: v })}
          />
        </FieldRow>
        {branding.showRollNoGrid && (
          <Field label="Roll Number Digits">
            <input
              type="number"
              min={4}
              max={16}
              value={branding.rollNoDigits}
              onChange={(e) => updateBranding({ rollNoDigits: Number(e.target.value) })}
              className="w-full rounded-lg border border-ink-200 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 px-3 py-2 text-[14px]"
            />
          </Field>
        )}
        <Toggle label="Show OMR Hint Text" checked={branding.showOMRHint} onChange={(v) => updateBranding({ showOMRHint: v })} />
      </SectionCard>
    </div>
  );
}
