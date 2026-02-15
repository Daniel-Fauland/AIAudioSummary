"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKeys } from "@/hooks/useApiKeys";
import type { AzureConfig } from "@/lib/types";

interface AzureConfigFormProps {
  config: AzureConfig | null;
  onConfigChange: (config: AzureConfig) => void;
}

export function AzureConfigForm({
  config,
  onConfigChange,
}: AzureConfigFormProps) {
  const { setAzureConfig } = useApiKeys();
  const [values, setValues] = useState<AzureConfig>(
    config ?? { api_version: "", azure_endpoint: "", deployment_name: "" },
  );

  const endpointError =
    values.azure_endpoint.length > 0 &&
    !values.azure_endpoint.startsWith("https://");

  const handleChange = (field: keyof AzureConfig, value: string) => {
    const updated = { ...values, [field]: value };
    setValues(updated);
    setAzureConfig(updated);
    onConfigChange(updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground-secondary">
        Azure Configuration
      </h3>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          API Version
        </Label>
        <Input
          value={values.api_version}
          onChange={(e) => handleChange("api_version", e.target.value)}
          placeholder="e.g., 2024-02-15-preview"
          className="bg-card-elevated"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          Azure Endpoint
        </Label>
        <Input
          value={values.azure_endpoint}
          onChange={(e) => handleChange("azure_endpoint", e.target.value)}
          placeholder="https://my-resource.openai.azure.com/"
          className={`bg-card-elevated ${endpointError ? "border-destructive" : ""}`}
        />
        {endpointError ? (
          <p className="text-xs text-destructive">
            Endpoint must start with https://
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground-secondary">
          Deployment Name
        </Label>
        <Input
          value={values.deployment_name}
          onChange={(e) => handleChange("deployment_name", e.target.value)}
          placeholder="e.g., gpt-4-deployment"
          className="bg-card-elevated"
        />
      </div>
    </div>
  );
}
