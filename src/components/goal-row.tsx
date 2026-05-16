"use client";

import { useFormContext } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ThrustOption {
  id: string;
  name: string;
}

interface GoalRowProps {
  index: number;
  thrustAreas: ThrustOption[];
  onRemove: () => void;
  isShared?: boolean;
  editable?: boolean;
}

const UOM_LABELS: Record<UomType, string> = {
  [UomType.MIN]: "Higher is better",
  [UomType.MAX]: "Lower is better",
  [UomType.TIMELINE]: "Date-based",
  [UomType.ZERO]: "Zero = success",
};

export function GoalRow({
  index,
  thrustAreas,
  onRemove,
  isShared = false,
  editable = true,
}: GoalRowProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const uomType = watch(`goals.${index}.uomType`) as UomType;
  const goalErrors = (errors.goals as unknown as Record<number, Record<string, { message?: string }>>)?.[index];

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-surface-2 font-mono text-[10px] font-medium text-text-secondary">
            {index + 1}
          </span>
          {isShared && (
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              <span className="text-xs text-text-secondary">
                Shared — only weightage is editable
              </span>
            </span>
          )}
        </div>
        {!isShared && editable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove goal"
            className="-mr-2 -mt-2"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor={`title-${index}`}>Goal title</Label>
        <Input
          id={`title-${index}`}
          {...register(`goals.${index}.title`)}
          placeholder="e.g. Hit Q1 enterprise revenue target"
          disabled={isShared}
          aria-invalid={!!goalErrors?.title}
        />
        {goalErrors?.title?.message && (
          <p className="text-xs text-danger">{goalErrors.title.message}</p>
        )}
      </div>

      {/* Thrust + UoM + Weightage */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="space-y-2 md:col-span-5">
          <Label htmlFor={`thrust-${index}`}>Thrust area</Label>
          <Select
            value={watch(`goals.${index}.thrustAreaId`) || undefined}
            onValueChange={(v) =>
              setValue(`goals.${index}.thrustAreaId`, v, { shouldValidate: true })
            }
            disabled={isShared}
          >
            <SelectTrigger
              id={`thrust-${index}`}
              aria-invalid={!!goalErrors?.thrustAreaId}
            >
              <SelectValue placeholder="Select thrust area" />
            </SelectTrigger>
            <SelectContent>
              {thrustAreas.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {goalErrors?.thrustAreaId?.message && (
            <p className="text-xs text-danger">
              {goalErrors.thrustAreaId.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`uom-${index}`}>Unit of measurement</Label>
          <Select
            value={uomType}
            onValueChange={(v) => {
              setValue(`goals.${index}.uomType`, v as UomType, {
                shouldValidate: true,
              });
              // Reset incompatible fields when UoM changes.
              if (v === UomType.TIMELINE) {
                setValue(`goals.${index}.target`, null);
              } else if (v === UomType.ZERO) {
                setValue(`goals.${index}.target`, null);
                setValue(`goals.${index}.targetDate`, null);
              } else {
                setValue(`goals.${index}.targetDate`, null);
              }
            }}
            disabled={isShared}
          >
            <SelectTrigger id={`uom-${index}`}>
              <SelectValue placeholder="Pick UoM" />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(UomType) as UomType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">
                      {t}
                    </span>
                    <span>{UOM_LABELS[t]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor={`weightage-${index}`}>Weightage (%)</Label>
          <Input
            id={`weightage-${index}`}
            type="number"
            inputMode="numeric"
            min={10}
            max={100}
            step={1}
            {...register(`goals.${index}.weightage`, { valueAsNumber: true })}
            placeholder="e.g. 30"
            aria-invalid={!!goalErrors?.weightage}
          />
          {goalErrors?.weightage?.message && (
            <p className="text-xs text-danger">
              {goalErrors.weightage.message}
            </p>
          )}
        </div>
      </div>

      {/* Target / Target date — discriminated by UoM */}
      {(uomType === UomType.MIN || uomType === UomType.MAX) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor={`target-${index}`}>
              Target value ({uomType === UomType.MIN ? "higher is better" : "lower is better"})
            </Label>
            <Input
              id={`target-${index}`}
              type="number"
              inputMode="decimal"
              step="any"
              {...register(`goals.${index}.target`, { valueAsNumber: true })}
              placeholder="e.g. 1000000"
              disabled={isShared}
              aria-invalid={!!goalErrors?.target}
            />
            {goalErrors?.target?.message && (
              <p className="text-xs text-danger">{goalErrors.target.message}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor={`uomLabel-${index}`}>Unit label</Label>
            <Input
              id={`uomLabel-${index}`}
              {...register(`goals.${index}.uomLabel`)}
              placeholder="e.g. INR, accounts, %, days"
              disabled={isShared}
              aria-invalid={!!goalErrors?.uomLabel}
            />
            {goalErrors?.uomLabel?.message && (
              <p className="text-xs text-danger">
                {goalErrors.uomLabel.message}
              </p>
            )}
          </div>
        </div>
      )}

      {uomType === UomType.TIMELINE && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor={`targetDate-${index}`}>Deadline</Label>
            <Input
              id={`targetDate-${index}`}
              type="date"
              {...register(`goals.${index}.targetDate`)}
              disabled={isShared}
              aria-invalid={!!goalErrors?.targetDate}
            />
            {goalErrors?.targetDate?.message && (
              <p className="text-xs text-danger">
                {goalErrors.targetDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor={`uomLabel-${index}`}>Label</Label>
            <Input
              id={`uomLabel-${index}`}
              {...register(`goals.${index}.uomLabel`)}
              placeholder="e.g. date, milestone"
              disabled={isShared}
            />
          </div>
        </div>
      )}

      {uomType === UomType.ZERO && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor={`uomLabel-${index}`}>What is being counted to zero?</Label>
            <Input
              id={`uomLabel-${index}`}
              {...register(`goals.${index}.uomLabel`)}
              placeholder="e.g. incidents, breaches, defects"
              disabled={isShared}
              aria-invalid={!!goalErrors?.uomLabel}
            />
            {goalErrors?.uomLabel?.message && (
              <p className="text-xs text-danger">
                {goalErrors.uomLabel.message}
              </p>
            )}
          </div>
          <div className="md:col-span-6">
            <p
              className={cn(
                "rounded-sm border border-dashed border-border bg-surface-2 px-3 py-2 text-xs text-text-muted",
                "h-9 flex items-center",
              )}
            >
              Score = 100% if actual is 0, else 0%
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor={`description-${index}`}>
          Description{" "}
          <span className="normal-case text-text-placeholder">(optional)</span>
        </Label>
        <Textarea
          id={`description-${index}`}
          {...register(`goals.${index}.description`)}
          placeholder="Add context, links, or key milestones."
          disabled={isShared}
          rows={2}
        />
      </div>
    </div>
  );
}
