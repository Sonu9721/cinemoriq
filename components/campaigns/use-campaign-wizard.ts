'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  browserCampaignDraftStore,
  createStoredDraft,
} from './campaign-draft-store';
import { createAndSaveCampaignRecord } from './campaign-record-store';
import {
  initialCampaignDraft,
  validateCampaignStep,
  type CampaignDraft,
  type CampaignDraftField,
  type CampaignValidationErrors,
} from './campaign-wizard-model';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type TransitionStatus = 'idle' | 'continuing' | 'generating';

export function useCampaignWizard() {
  const [draft, setDraft] = useState<CampaignDraft>(initialCampaignDraft);
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [errors, setErrors] = useState<CampaignValidationErrors>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [transitionStatus, setTransitionStatus] =
    useState<TransitionStatus>('idle');
  const [notice, setNotice] = useState('');
  const [generated, setGenerated] = useState(false);
  const [generatedCampaignId, setGeneratedCampaignId] = useState<string | null>(
    null,
  );
  const saveTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  const currentStepRef = useRef(currentStep);
  const furthestStepRef = useRef(furthestStep);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    furthestStepRef.current = furthestStep;
  }, [furthestStep]);

  useEffect(() => {
    const stored = browserCampaignDraftStore.load();
    if (!stored) return;
    const hydrateTimer = window.setTimeout(() => {
      setDraft(stored.draft);
      setCurrentStep(stored.currentStep);
      setFurthestStep(stored.furthestStep);
      setSaveStatus('saved');
      setNotice('Draft restored from this device.');
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const writeDraft = useCallback(
    (
      nextDraft = draftRef.current,
      nextStep = currentStepRef.current,
      nextFurthestStep = furthestStepRef.current,
    ) => {
      try {
        browserCampaignDraftStore.save(
          createStoredDraft(nextDraft, nextStep, nextFurthestStep),
        );
        return true;
      } catch {
        setSaveStatus('error');
        setNotice(
          'This browser could not save the draft. Check site storage permissions and try again.',
        );
        return false;
      }
    },
    [],
  );

  const updateField = useCallback(
    <K extends CampaignDraftField>(field: K, value: CampaignDraft[K]) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setDraft((current) => {
        const confirmationFields: CampaignDraftField[] = [
          'campaignName',
          'confirmAssetRights',
          'confirmNoUnauthorizedIdentity',
          'confirmHumanReview',
        ];
        const resetFinalConfirmations = !confirmationFields.includes(field);
        const next = {
          ...current,
          [field]: value,
          ...(field === 'peoplePolicy'
            ? { syntheticRightsConfirmed: false }
            : null),
          ...(resetFinalConfirmations
            ? {
                confirmAssetRights: false,
                confirmNoUnauthorizedIdentity: false,
                confirmHumanReview: false,
              }
            : null),
        };
        draftRef.current = next;
        return next;
      });
      setErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setSaveStatus('idle');
      setNotice('');
      setGenerated(false);
    },
    [],
  );

  const saveDraft = useCallback(() => {
    if (saveStatus === 'saving') return false;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    setNotice('');
    if (!writeDraft()) return false;
    saveTimerRef.current = window.setTimeout(() => {
      setSaveStatus('saved');
      setNotice('Saved on this device.');
      saveTimerRef.current = null;
    }, 450);
    return true;
  }, [saveStatus, writeDraft]);

  const continueToNextStep = useCallback(() => {
    if (transitionStatus !== 'idle' || currentStep >= 6) return false;
    const nextErrors = validateCampaignStep(currentStep, draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setNotice('Review the highlighted fields before continuing.');
      return false;
    }

    setNotice('');
    const nextStep = currentStep + 1;
    const nextFurthestStep = Math.max(furthestStep, nextStep);
    if (!writeDraft(draft, nextStep, nextFurthestStep)) return false;
    setCurrentStep(nextStep);
    setFurthestStep(nextFurthestStep);
    setErrors({});
    setSaveStatus('saved');
    return true;
  }, [currentStep, draft, furthestStep, transitionStatus, writeDraft]);

  const goBack = useCallback(() => {
    if (transitionStatus !== 'idle' || currentStep === 0) return;
    const nextStep = currentStep - 1;
    setCurrentStep(nextStep);
    setErrors({});
    setGenerated(false);
    setNotice('');
    writeDraft(draft, nextStep, furthestStep);
  }, [currentStep, draft, furthestStep, transitionStatus, writeDraft]);

  const goToStep = useCallback(
    (step: number) => {
      if (
        transitionStatus !== 'idle' ||
        step < 0 ||
        step > furthestStep ||
        step > 6
      ) {
        return;
      }
      if (step > currentStep) {
        const currentErrors = validateCampaignStep(currentStep, draft);
        if (Object.keys(currentErrors).length > 0) {
          setErrors(currentErrors);
          setNotice('Review the highlighted fields before moving ahead.');
          return;
        }
      }
      setCurrentStep(step);
      setErrors({});
      setGenerated(false);
      setNotice('');
      writeDraft(draft, step, furthestStep);
    },
    [currentStep, draft, furthestStep, transitionStatus, writeDraft],
  );

  const generateBrief = useCallback(() => {
    if (transitionStatus !== 'idle') return false;

    for (let step = 1; step <= 6; step += 1) {
      const stepErrors = validateCampaignStep(step, draft);
      if (Object.keys(stepErrors).length > 0) {
        setCurrentStep(step);
        setFurthestStep((current) => Math.max(current, step));
        setErrors(stepErrors);
        setNotice('Review the highlighted fields before generating the brief.');
        return false;
      }
    }

    setNotice('');
    if (!writeDraft(draft, 6, 6)) return false;
    setTransitionStatus('generating');
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      try {
        const record = createAndSaveCampaignRecord(draft);
        setGeneratedCampaignId(record.id);
        setGenerated(true);
        setTransitionStatus('idle');
        setSaveStatus('saved');
        setNotice(
          'Campaign brief and workspace record saved locally on this device.',
        );
      } catch {
        setTransitionStatus('idle');
        setSaveStatus('error');
        setNotice(
          'The brief is valid, but this browser could not create its workspace record. Check site storage permissions and try again.',
        );
      }
    }, 1800);
    return true;
  }, [draft, transitionStatus, writeDraft]);

  const resetWizard = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    try {
      browserCampaignDraftStore.clear();
    } catch {
      setSaveStatus('error');
      setNotice('This browser could not clear the saved draft.');
      return false;
    }
    setDraft(initialCampaignDraft);
    draftRef.current = initialCampaignDraft;
    setCurrentStep(0);
    currentStepRef.current = 0;
    setFurthestStep(0);
    furthestStepRef.current = 0;
    setErrors({});
    setSaveStatus('idle');
    setTransitionStatus('idle');
    setNotice('');
    setGenerated(false);
    setGeneratedCampaignId(null);
    return true;
  }, []);

  return {
    draft,
    currentStep,
    furthestStep,
    errors,
    saveStatus,
    transitionStatus,
    notice,
    generated,
    generatedCampaignId,
    updateField,
    saveDraft,
    continueToNextStep,
    goBack,
    goToStep,
    generateBrief,
    resetWizard,
    setGenerated,
  };
}
