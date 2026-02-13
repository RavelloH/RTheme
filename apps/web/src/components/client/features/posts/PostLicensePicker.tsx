"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RiFileListLine,
  RiProfileLine,
  RiQuestionLine,
} from "@remixicon/react";

import {
  DEFAULT_POST_LICENSE,
  getPostLicenseMeta,
  getPostLicenseSelectionLabel,
  POST_LICENSES,
  type PostLicenseSelection,
  type PostLicenseValue,
  renderPostLicenseIcon,
} from "@/lib/shared/post-license";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { Dialog } from "@/ui/Dialog";
import { Tooltip } from "@/ui/Tooltip";

type PickerMode = "license" | "wizard";
type WizardStrategy = "reserve" | "open";

interface WizardState {
  strategy: WizardStrategy;
  attributionRequired: boolean;
  allowCommercial: boolean;
  allowDerivative: boolean;
  requireShareAlike: boolean;
}

interface PostLicensePickerProps {
  value: PostLicenseSelection;
  onChange: (value: PostLicenseSelection) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

function createWizardStateFromLicense(license: PostLicenseValue): WizardState {
  if (license === "all-rights-reserved") {
    return {
      strategy: "reserve",
      attributionRequired: true,
      allowCommercial: false,
      allowDerivative: false,
      requireShareAlike: false,
    };
  }

  if (license === "cc-0") {
    return {
      strategy: "open",
      attributionRequired: false,
      allowCommercial: true,
      allowDerivative: true,
      requireShareAlike: false,
    };
  }

  const allowCommercial = !license.includes("nc");
  const allowDerivative = !license.includes("nd");
  const requireShareAlike = license.includes("sa");

  return {
    strategy: "open",
    attributionRequired: true,
    allowCommercial,
    allowDerivative,
    requireShareAlike,
  };
}

function recommendLicenseByWizard(state: WizardState): PostLicenseValue {
  if (state.strategy === "reserve") {
    return "all-rights-reserved";
  }

  if (!state.attributionRequired) {
    return "cc-0";
  }

  if (!state.allowCommercial && !state.allowDerivative) {
    return "cc-by-nc-nd";
  }

  if (!state.allowCommercial && state.allowDerivative) {
    return state.requireShareAlike ? "cc-by-nc-sa" : "cc-by-nc";
  }

  if (state.allowCommercial && !state.allowDerivative) {
    return "cc-by-nd";
  }

  if (state.allowCommercial && state.allowDerivative) {
    return state.requireShareAlike ? "cc-by-sa" : "cc-by";
  }

  return DEFAULT_POST_LICENSE;
}

function SelectionButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; description: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-xs px-3 py-3 text-left transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/40 text-foreground"
            }`}
          >
            <p className="text-sm font-medium">{option.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default function PostLicensePicker({
  value,
  onChange,
  label = "版权许可",
  helperText = "选择文章的版权许可，默认将跟随站点配置",
  disabled = false,
}: PostLicensePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("license");
  const [draftSelection, setDraftSelection] =
    useState<PostLicenseSelection>(value);
  const [wizardState, setWizardState] = useState<WizardState>(() =>
    createWizardStateFromLicense(DEFAULT_POST_LICENSE),
  );

  useEffect(() => {
    if (!open) return;

    setMode("license");
    setDraftSelection(value);
    setWizardState(
      createWizardStateFromLicense(
        value === "default" ? DEFAULT_POST_LICENSE : value,
      ),
    );
  }, [open, value]);

  const wizardRecommendation = useMemo(
    () => recommendLicenseByWizard(wizardState),
    [wizardState],
  );
  const wizardRecommendationMeta = getPostLicenseMeta(wizardRecommendation);
  const selectedMeta =
    draftSelection === "default" ? null : getPostLicenseMeta(draftSelection);

  const applySelection = (selection: PostLicenseSelection) => {
    onChange(selection);
    setOpen(false);
  };

  return (
    <>
      <div className="space-y-2 flex flex-col">
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        <Clickable
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          hoverScale={1}
          tapScale={0.95}
          className={`flex items-center gap-2 px-3 py-2 border border-border rounded-sm transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
          }`}
        >
          <AutoTransition className="flex-1" duration={0.2} type="fade">
            <span key={value} className="flex items-center gap-2 text-left">
              {value === "default" ? (
                <RiProfileLine size="1.1em" />
              ) : (
                renderPostLicenseIcon(value, "text-muted-foreground")
              )}
              <span className="text-foreground">
                {getPostLicenseSelectionLabel(value)}
              </span>
            </span>
          </AutoTransition>
        </Clickable>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="选择版权许可"
        size="xl"
      >
        <div className="flex h-[700px] bg-background border border-border overflow-hidden">
          <div className="w-16 bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-3 overflow-y-auto no-scrollbar">
            <Tooltip content="LICENSE" placement="left">
              <Clickable
                hoverScale={1}
                onClick={() => setMode("license")}
                className="relative group w-12 h-12 flex items-center justify-center transition-all duration-200"
              >
                <div
                  className={`absolute left-0 bg-primary transition-all duration-200 ${
                    mode === "license"
                      ? "h-8 w-1"
                      : "h-2 w-1 opacity-0 group-hover:opacity-50 group-hover:h-4"
                  }`}
                />
                <div
                  className={
                    mode === "license"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  <RiFileListLine size="1.25em" />
                </div>
              </Clickable>
            </Tooltip>
            <Tooltip content="向导" placement="left">
              <Clickable
                hoverScale={1}
                onClick={() => setMode("wizard")}
                className="relative group w-12 h-12 flex items-center justify-center transition-all duration-200"
              >
                <div
                  className={`absolute left-0 bg-primary transition-all duration-200 ${
                    mode === "wizard"
                      ? "h-8 w-1"
                      : "h-2 w-1 opacity-0 group-hover:opacity-50 group-hover:h-4"
                  }`}
                />
                <div
                  className={
                    mode === "wizard" ? "text-primary" : "text-muted-foreground"
                  }
                >
                  <RiQuestionLine size="1.25em" />
                </div>
              </Clickable>
            </Tooltip>
          </div>

          <AutoTransition
            className="flex-1 h-full min-w-0"
            duration={0.25}
            type="fade"
          >
            {mode === "license" ? (
              <div key="mode-license" className="flex h-full min-w-0">
                <div className="w-96 bg-muted/10 border-r border-border flex flex-col">
                  <div className="h-12 border-b border-border flex items-center px-4 font-medium text-sm">
                    LICENSE
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <button
                      type="button"
                      key="license-option-default"
                      onClick={() => setDraftSelection("default")}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                        draftSelection === "default"
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          默认（跟随站点设置）
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          保存时按系统配置自动决定文章许可
                        </p>
                      </div>
                    </button>
                    {POST_LICENSES.map((license) => {
                      const active = draftSelection === license.value;
                      return (
                        <button
                          type="button"
                          key={license.value}
                          onClick={() => setDraftSelection(license.value)}
                          className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                            active
                              ? "bg-primary/5 text-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-semibold truncate ${
                                active ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {license.shortLabel}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {license.fullLabel}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 bg-background flex flex-col min-w-0">
                  <div className="h-12 border-b border-border flex items-center px-6 font-medium text-sm bg-card/30 flex-shrink-0">
                    许可详情
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <AutoTransition duration={0.2} type="fade">
                      {selectedMeta ? (
                        <div key={selectedMeta.value} className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground">
                              {renderPostLicenseIcon(selectedMeta.value)}
                              <h3 className="text-xl font-semibold">
                                {selectedMeta.shortLabel}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {selectedMeta.fullLabel}
                            </p>
                          </div>

                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2">
                                能做什么
                              </h4>
                              <div className="space-y-2">
                                {selectedMeta.allow.map((item) => (
                                  <p
                                    key={item}
                                    className="text-sm text-muted-foreground"
                                  >
                                    · {item}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2">
                                不能做什么
                              </h4>
                              <div className="space-y-2">
                                {selectedMeta.disallow.map((item) => (
                                  <p
                                    key={item}
                                    className="text-sm text-muted-foreground"
                                  >
                                    · {item}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          {selectedMeta.referenceUrl && (
                            <a
                              href={selectedMeta.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-primary hover:underline inline-block"
                            >
                              查看官方协议说明
                            </a>
                          )}

                          <div className="pt-6 border-t border-border">
                            <Button
                              size="md"
                              label="选择此许可"
                              variant="primary"
                              fullWidth
                              onClick={() => applySelection(selectedMeta.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div key="default-license" className="space-y-4">
                          <h3 className="text-xl font-semibold text-foreground">
                            默认策略
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            当前保持为默认。文章保存时，服务端会按
                            `content.license.default` 的配置决定实际许可。
                          </p>
                          <p className="text-sm text-muted-foreground">
                            如果需要为这篇文章单独指定许可，请在左侧选择具体
                            LICENSE。
                          </p>
                          <div className="pt-6 border-t border-border">
                            <Button
                              size="md"
                              label="保持默认"
                              variant="primary"
                              fullWidth
                              onClick={() => applySelection("default")}
                            />
                          </div>
                        </div>
                      )}
                    </AutoTransition>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key="mode-wizard"
                className="flex-1 bg-background flex flex-col min-w-0 h-full"
              >
                <div className="h-12 border-b border-border flex items-center px-6 font-medium text-sm bg-card/30 flex-shrink-0">
                  向导
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <AutoResizer>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        1. 你希望开放程度是？
                      </h3>
                      <SelectionButtons<WizardStrategy>
                        value={wizardState.strategy}
                        onChange={(nextValue) =>
                          setWizardState((prev) => ({
                            ...prev,
                            strategy: nextValue,
                          }))
                        }
                        options={[
                          {
                            value: "reserve",
                            label: "保留所有权利",
                            description: "未经授权不允许转载、改作和商用",
                          },
                          {
                            value: "open",
                            label: "开放授权",
                            description: "允许在条件约束下转载或再创作",
                          },
                        ]}
                      />
                    </div>
                    <AutoTransition duration={0.2} type="slideUp">
                      {wizardState.strategy === "open" ? (
                        <div key="wizard-step-2" className="space-y-3 mt-6">
                          <h3 className="text-sm font-semibold text-foreground">
                            2. 是否强制署名？
                          </h3>
                          <SelectionButtons<"required" | "not-required">
                            value={
                              wizardState.attributionRequired
                                ? "required"
                                : "not-required"
                            }
                            onChange={(nextValue) =>
                              setWizardState((prev) => ({
                                ...prev,
                                attributionRequired: nextValue === "required",
                              }))
                            }
                            options={[
                              {
                                value: "required",
                                label: "必须署名",
                                description: "保留作者和来源信息",
                              },
                              {
                                value: "not-required",
                                label: "不强制署名",
                                description: "即 CC0 公共领域贡献",
                              },
                            ]}
                          />
                        </div>
                      ) : null}
                    </AutoTransition>

                    <AutoTransition duration={0.2} type="slideUp">
                      {wizardState.strategy === "open" &&
                      wizardState.attributionRequired ? (
                        <div key="wizard-step-3-4-5" className="space-y-6">
                          <div className="space-y-3 mt-6">
                            <h3 className="text-sm font-semibold text-foreground">
                              3. 是否允许商业使用？
                            </h3>
                            <SelectionButtons<"yes" | "no">
                              value={wizardState.allowCommercial ? "yes" : "no"}
                              onChange={(nextValue) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  allowCommercial: nextValue === "yes",
                                }))
                              }
                              options={[
                                {
                                  value: "yes",
                                  label: "允许",
                                  description: "他人可用于商业场景",
                                },
                                {
                                  value: "no",
                                  label: "不允许",
                                  description: "仅允许非商业使用",
                                },
                              ]}
                            />
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">
                              4. 是否允许改作？
                            </h3>
                            <SelectionButtons<"yes" | "no">
                              value={wizardState.allowDerivative ? "yes" : "no"}
                              onChange={(nextValue) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  allowDerivative: nextValue === "yes",
                                  requireShareAlike:
                                    nextValue === "yes"
                                      ? prev.requireShareAlike
                                      : false,
                                }))
                              }
                              options={[
                                {
                                  value: "yes",
                                  label: "允许",
                                  description: "可修改并基于原文二次创作",
                                },
                                {
                                  value: "no",
                                  label: "不允许",
                                  description: "仅允许原文分发",
                                },
                              ]}
                            />
                          </div>

                          <AutoTransition duration={0.2} type="slideUp">
                            {wizardState.allowDerivative ? (
                              <div key="wizard-step-5" className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                  5. 改作后是否要求同许可分享？
                                </h3>
                                <SelectionButtons<"yes" | "no">
                                  value={
                                    wizardState.requireShareAlike ? "yes" : "no"
                                  }
                                  onChange={(nextValue) =>
                                    setWizardState((prev) => ({
                                      ...prev,
                                      requireShareAlike: nextValue === "yes",
                                    }))
                                  }
                                  options={[
                                    {
                                      value: "yes",
                                      label: "要求同许可",
                                      description: "衍生内容必须继续开放",
                                    },
                                    {
                                      value: "no",
                                      label: "不要求",
                                      description: "衍生内容许可可由作者自定",
                                    },
                                  ]}
                                />
                              </div>
                            ) : null}
                          </AutoTransition>
                        </div>
                      ) : null}
                    </AutoTransition>
                  </AutoResizer>

                  <AutoTransition duration={0.2} type="fade">
                    <div
                      key={wizardRecommendationMeta.value}
                      className="rounded-sm border-t border-border px-4 pt-6 space-y-3"
                    >
                      <p className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                        {renderPostLicenseIcon(wizardRecommendationMeta.value)}
                        推荐：{wizardRecommendationMeta.shortLabel}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {wizardRecommendationMeta.fullLabel}
                      </p>
                      <div className="space-y-1">
                        {wizardRecommendationMeta.allow
                          .slice(0, 2)
                          .map((item) => (
                            <p
                              key={item}
                              className="text-xs text-muted-foreground"
                            >
                              · {item}
                            </p>
                          ))}
                      </div>
                    </div>
                  </AutoTransition>

                  <div className="pt-4 border-t border-border flex gap-2">
                    <Button
                      size="sm"
                      label="应用推荐许可"
                      variant="primary"
                      onClick={() => applySelection(wizardRecommendation)}
                    />
                    <Button
                      size="sm"
                      label="恢复默认策略"
                      variant="ghost"
                      onClick={() => applySelection("default")}
                    />
                  </div>
                </div>
              </div>
            )}
          </AutoTransition>
        </div>
      </Dialog>
    </>
  );
}
