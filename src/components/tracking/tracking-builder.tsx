"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TrackingFormState = {
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  campaignId: string;
  adsetId: string;
  adId: string;
  campaignName: string;
};

const initialState: TrackingFormState = {
  baseUrl: "https://example.com/landing-page",
  utmSource: "facebook",
  utmMedium: "paid",
  campaignId: "{{campaign.id}}",
  adsetId: "{{adset.id}}",
  adId: "{{ad.id}}",
  campaignName: "{{campaign.name}}",
};

export function TrackingBuilder() {
  const [formState, setFormState] = useState<TrackingFormState>(initialState);
  const [copied, setCopied] = useState(false);
  const generatedUrl = useMemo(() => buildTrackingUrl(formState), [formState]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
    setCopied(false);
  }

  async function handleCopy() {
    if (!generatedUrl.url) {
      return;
    }

    await navigator.clipboard.writeText(generatedUrl.url);
    setCopied(true);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="success">URL Builder</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Parâmetros para Meta Ads
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Configure macros e UTMs para gerar uma URL pronta para colar no
              campo de URL do anúncio.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-3">
            <Link2 className="text-indigo-200" size={22} />
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <Field
            label="URL base"
            name="baseUrl"
            onChange={handleChange}
            placeholder="https://example.com/landing-page"
            value={formState.baseUrl}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="utm_source"
              name="utmSource"
              onChange={handleChange}
              value={formState.utmSource}
            />
            <Field
              label="utm_medium"
              name="utmMedium"
              onChange={handleChange}
              value={formState.utmMedium}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="campaignId macro"
              name="campaignId"
              onChange={handleChange}
              value={formState.campaignId}
            />
            <Field
              label="adsetId macro"
              name="adsetId"
              onChange={handleChange}
              value={formState.adsetId}
            />
            <Field
              label="adId macro"
              name="adId"
              onChange={handleChange}
              value={formState.adId}
            />
            <Field
              label="campaignName macro"
              name="campaignName"
              onChange={handleChange}
              value={formState.campaignName}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <Badge>Preview</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">URL final</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              A URL gerada inclui UTMs e parâmetros `fb_*` para leitura futura no Dashzada ROI.
            </p>
          </div>
          <Button disabled={!generatedUrl.url} onClick={handleCopy} variant="secondary">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-4">
          {generatedUrl.error ? (
            <p className="text-sm leading-6 text-red-200">{generatedUrl.error}</p>
          ) : (
            <p className="break-all font-mono text-sm leading-7 text-indigo-100">{generatedUrl.url}</p>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-blue-300/20 bg-blue-400/10 p-5">
          <h3 className="font-semibold text-blue-100">Como usar no Ads Manager</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-blue-100/80">
            <li>Copie a URL final gerada nesta tela.</li>
            <li>Cole no campo de URL do anúncio ou da landing page no Meta Ads Manager.</li>
            <li>Mantenha as macros entre chaves para o Meta substituir pelos IDs reais durante a entrega.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  name: keyof TrackingFormState;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={name}>
        {label}
      </label>
      <Input
        id={name}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </div>
  );
}

function buildTrackingUrl(formState: TrackingFormState) {
  if (!formState.baseUrl.trim()) {
    return {
      error: "Informe uma URL base para gerar o preview.",
      url: "",
    };
  }

  try {
    const url = new URL(formState.baseUrl);

    url.searchParams.set("utm_source", formState.utmSource);
    url.searchParams.set("utm_medium", formState.utmMedium);
    url.searchParams.set("utm_campaign", formState.campaignId);
    url.searchParams.set("utm_content", formState.adId);
    url.searchParams.set("fb_campaign_id", formState.campaignId);
    url.searchParams.set("fb_adset_id", formState.adsetId);
    url.searchParams.set("fb_ad_id", formState.adId);

    return {
      error: "",
      url: decodeTrackingMacros(url.toString()),
    };
  } catch {
    return {
      error: "Informe uma URL absoluta válida, começando com https:// ou http://.",
      url: "",
    };
  }
}

function decodeTrackingMacros(url: string) {
  return url.replaceAll("%7B%7B", "{{").replaceAll("%7D%7D", "}}");
}
