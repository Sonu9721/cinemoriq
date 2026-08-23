'use client';

import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Film,
  Flag,
  Globe2,
  LayoutPanelTop,
  Mail,
  Megaphone,
  MessageSquareText,
  MonitorPlay,
  Package,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Target,
  UserRound,
  Users,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Textarea,
  cx,
} from '../ui/primitives';
import {
  channelLabels,
  objectiveLabels,
  type CampaignDraft,
  type CampaignDraftField,
  type CampaignValidationErrors,
} from './campaign-wizard-model';

export type UpdateCampaignField = <K extends CampaignDraftField>(
  field: K,
  value: CampaignDraft[K],
) => void;

type StepPanelProps = {
  draft: CampaignDraft;
  errors: CampaignValidationErrors;
  updateField: UpdateCampaignField;
};

const marketOptions = [
  'United States',
  'United Kingdom',
  'Europe',
  'UAE',
  'Asia-Pacific',
  'Global',
];

const toneOptions = [
  'Authoritative',
  'Premium',
  'Innovative',
  'Technical',
  'Human',
  'Bold',
];

const channelOptions: Array<{
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'linkedin',
    title: 'LinkedIn',
    description: 'Executive and B2B storytelling',
    icon: BriefcaseBusiness,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Master films and explainers',
    icon: Play,
  },
  {
    id: 'instagram',
    title: 'Instagram / Reels',
    description: 'Vertical, high-impact discovery',
    icon: Smartphone,
  },
  {
    id: 'paid-social',
    title: 'Paid Social',
    description: 'Performance-focused variants',
    icon: Megaphone,
  },
  {
    id: 'website',
    title: 'Website / Landing Page',
    description: 'High-intent campaign destination',
    icon: LayoutPanelTop,
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Owned-audience activation',
    icon: Mail,
  },
];

const creativeStyles = [
  {
    title: 'Cinematic Product Film',
    description: 'Premium visual storytelling built around product detail.',
    icon: Film,
  },
  {
    title: 'Technical Explainer',
    description: 'Clear system, feature, and proof-led communication.',
    icon: MonitorPlay,
  },
  {
    title: 'Documentary Story',
    description: 'Human context, credibility, and real-world texture.',
    icon: UserRound,
  },
  {
    title: 'Editorial Luxury',
    description: 'Restrained art direction with high-fashion precision.',
    icon: Sparkles,
  },
  {
    title: 'Creator-led Ad',
    description: 'Direct, native-feeling performance creative.',
    icon: MessageSquareText,
  },
];

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx('wizard-panel', className)}>{children}</section>;
}

function PanelHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="wizard-panel__heading">
      <span className="wizard-panel__icon" aria-hidden="true">
        <Icon size={19} strokeWidth={1.7} />
      </span>
      <span>
        <span className="wizard-panel__eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </header>
  );
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p className="wizard-field-error" id={id} role="alert">
      {children}
    </p>
  );
}

function ToggleChip({
  name,
  value,
  checked,
  type = 'checkbox',
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  type?: 'checkbox' | 'radio';
  onChange: () => void;
}) {
  return (
    <label className={cx('choice-chip', checked && 'choice-chip--selected')}>
      <input
        className="sr-only"
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="choice-chip__check" aria-hidden="true">
        {checked ? <Check size={13} strokeWidth={2.4} /> : null}
      </span>
      <span>{value}</span>
    </label>
  );
}

function ChoiceTile({
  name,
  value,
  title,
  description,
  icon: Icon,
  checked,
  type = 'checkbox',
  onChange,
}: {
  name: string;
  value: string;
  title: string;
  description: string;
  icon: LucideIcon;
  checked: boolean;
  type?: 'checkbox' | 'radio';
  onChange: () => void;
}) {
  return (
    <label className={cx('choice-tile', checked && 'choice-tile--selected')}>
      <input
        className="sr-only"
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="choice-tile__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.7} />
      </span>
      <span className="choice-tile__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="choice-tile__indicator" aria-hidden="true">
        {checked ? <Check size={13} strokeWidth={2.5} /> : null}
      </span>
    </label>
  );
}

function toggleBoundedValue(
  values: string[],
  value: string,
  maximum: number,
) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (values.length >= maximum) return values;
  return [...values, value];
}

export function AudienceStep({ draft, errors, updateField }: StepPanelProps) {
  function toggleMarket(market: string) {
    if (market === 'Global') {
      updateField('primaryMarkets',
        draft.primaryMarkets.includes('Global') ? [] : ['Global'],
      );
      return;
    }
    const withoutGlobal = draft.primaryMarkets.filter((item) => item !== 'Global');
    updateField('primaryMarkets', toggleBoundedValue(withoutGlobal, market, 3));
  }

  return (
    <div className="wizard-form-grid">
      <Panel className="wizard-panel--span-7">
        <PanelHeading
          icon={Users}
          eyebrow="Audience profile"
          title="Who should this campaign move?"
          description="Keep the segment specific enough to guide messaging and visual choices."
        />
        <div className="wizard-fields wizard-fields--two">
          <Input
            id="audience-name"
            label="Audience name"
            value={draft.audienceName}
            onChange={(event) => updateField('audienceName', event.target.value)}
            error={errors.audienceName}
          />
          <Select
            id="audience-type"
            label="Audience type"
            value={draft.audienceType}
            onChange={(event) => updateField('audienceType', event.target.value)}
            error={errors.audienceType}
          >
            <option value="">Choose type</option>
            <option>B2B</option>
            <option>B2C</option>
            <option>Mixed</option>
          </Select>
          <Textarea
            id="audience-profile"
            fieldClassName="wizard-field--span-2"
            label="Roles or audience profile"
            rows={4}
            value={draft.audienceProfile}
            onChange={(event) => updateField('audienceProfile', event.target.value)}
            error={errors.audienceProfile}
          />
          <Textarea
            id="audience-pain"
            fieldClassName="wizard-field--span-2"
            label="Primary need or pain point"
            rows={4}
            value={draft.audiencePain}
            onChange={(event) => updateField('audiencePain', event.target.value)}
            error={errors.audiencePain}
          />
        </div>
      </Panel>

      <Panel className="wizard-panel--span-5">
        <PanelHeading
          icon={Globe2}
          eyebrow="Market focus"
          title="Where and when they buy"
        />
        <fieldset
          className="wizard-choice-field"
          aria-describedby="markets-error"
          aria-invalid={Boolean(errors.primaryMarkets)}
          tabIndex={errors.primaryMarkets ? -1 : undefined}
        >
          <legend>Primary markets · choose up to 3</legend>
          <div className="choice-chip-grid">
            {marketOptions.map((market) => (
              <ToggleChip
                key={market}
                name="primary-markets"
                value={market}
                checked={draft.primaryMarkets.includes(market)}
                onChange={() => toggleMarket(market)}
              />
            ))}
          </div>
          <FieldError id="markets-error">{errors.primaryMarkets}</FieldError>
        </fieldset>
        <Select
          id="buying-stage"
          label="Buying stage"
          value={draft.buyingStage}
          onChange={(event) => updateField('buyingStage', event.target.value)}
          error={errors.buyingStage}
        >
          <option value="">Choose stage</option>
          <option>Problem aware</option>
          <option>Solution aware</option>
          <option>Comparing options</option>
          <option>Ready to act</option>
        </Select>
      </Panel>
    </div>
  );
}

export function ProductStep({ draft, errors, updateField }: StepPanelProps) {
  function updateBenefit(index: number, value: string) {
    const next = [...draft.keyBenefits];
    next[index] = value;
    updateField('keyBenefits', next);
  }

  return (
    <div className="wizard-form-grid">
      <Panel className="wizard-panel--span-7">
        <PanelHeading
          icon={Package}
          eyebrow="Offer"
          title="Define what the audience receives"
          description="Lead with the business value; specifications support the story."
        />
        <div className="wizard-fields">
          <Input
            id="product-name"
            label="Product or service name"
            value={draft.productName}
            onChange={(event) => updateField('productName', event.target.value)}
            error={errors.productName}
          />
          <Input
            id="product-url"
            label="Reference URL · optional"
            type="url"
            value={draft.productUrl}
            onChange={(event) => updateField('productUrl', event.target.value)}
            error={errors.productUrl}
            hint="Used only as a reference; no automatic import in this build."
          />
          <Textarea
            id="value-proposition"
            label="Core value proposition"
            rows={4}
            value={draft.valueProposition}
            onChange={(event) => updateField('valueProposition', event.target.value)}
            error={errors.valueProposition}
          />
          <Textarea
            id="proof-constraints"
            label="Proof, specifications or claim limits · optional"
            rows={4}
            value={draft.proofConstraints}
            onChange={(event) => updateField('proofConstraints', event.target.value)}
            error={errors.proofConstraints}
          />
        </div>
      </Panel>

      <Panel className="wizard-panel--span-5">
        <PanelHeading
          icon={Target}
          eyebrow="Conversion"
          title="Shape the reason to act"
        />
        <fieldset
          className="wizard-choice-field"
          aria-describedby="benefits-error"
          aria-invalid={Boolean(errors.keyBenefits)}
          tabIndex={errors.keyBenefits ? -1 : undefined}
        >
          <legend>Key benefits · up to 3</legend>
          <div className="benefit-list">
            {[0, 1, 2].map((index) => (
              <Input
                key={index}
                id={`benefit-${index + 1}`}
                aria-label={`Key benefit ${index + 1}`}
                value={draft.keyBenefits[index] ?? ''}
                onChange={(event) => updateBenefit(index, event.target.value)}
                placeholder={`Benefit ${index + 1}`}
              />
            ))}
          </div>
          <FieldError id="benefits-error">{errors.keyBenefits}</FieldError>
        </fieldset>
        <Select
          id="primary-cta"
          label="Primary call to action"
          value={draft.primaryCta}
          onChange={(event) => updateField('primaryCta', event.target.value)}
          error={errors.primaryCta}
        >
          <option value="">Choose action</option>
          <option>Request a Quote</option>
          <option>Book a Demo</option>
          <option>Buy Now</option>
          <option>Learn More</option>
          <option>Join Waitlist</option>
        </Select>
      </Panel>
    </div>
  );
}

export function BrandStep({ draft, errors, updateField }: StepPanelProps) {
  return (
    <div className="wizard-form-grid">
      <Panel className="wizard-panel--span-5">
        <PanelHeading
          icon={Palette}
          eyebrow="Brand identity"
          title="Lock the voice"
        />
        <div className="brand-profile-preview">
          <CinemoriqMark className="brand-mark--profile" />
          <span>
            <strong>Cinemoriq guardrail template</strong>
            <small>Local campaign draft · human approval</small>
          </span>
          <StatusBadge tone="blue">Planning</StatusBadge>
        </div>
        <Input
          id="brand-name"
          label="Brand name"
          value={draft.brandName}
          onChange={(event) => updateField('brandName', event.target.value)}
          error={errors.brandName}
        />
        <fieldset
          className="wizard-choice-field"
          aria-describedby="tones-error"
          aria-invalid={Boolean(errors.brandTones)}
          tabIndex={errors.brandTones ? -1 : undefined}
        >
          <legend>Brand tone · choose up to 3</legend>
          <div className="choice-chip-grid">
            {toneOptions.map((tone) => (
              <ToggleChip
                key={tone}
                name="brand-tones"
                value={tone}
                checked={draft.brandTones.includes(tone)}
                onChange={() =>
                  updateField(
                    'brandTones',
                    toggleBoundedValue(draft.brandTones, tone, 3),
                  )
                }
              />
            ))}
          </div>
          <FieldError id="tones-error">{errors.brandTones}</FieldError>
        </fieldset>
      </Panel>

      <Panel className="wizard-panel--span-7">
        <PanelHeading
          icon={ShieldCheck}
          eyebrow="Guardrails"
          title="Define what every output must respect"
        />
        <div className="wizard-fields wizard-fields--two">
          <Textarea
            id="brand-voice"
            fieldClassName="wizard-field--span-2"
            label="Voice in one sentence"
            rows={4}
            value={draft.brandVoice}
            onChange={(event) => updateField('brandVoice', event.target.value)}
            error={errors.brandVoice}
          />
          <Textarea
            id="required-messages"
            label="Required words or messages · optional"
            rows={4}
            value={draft.requiredMessages}
            onChange={(event) => updateField('requiredMessages', event.target.value)}
            error={errors.requiredMessages}
          />
          <Textarea
            id="brand-avoid"
            label="Words, claims or themes to avoid · optional"
            rows={4}
            value={draft.brandAvoid}
            onChange={(event) => updateField('brandAvoid', event.target.value)}
            error={errors.brandAvoid}
          />
          <Input
            id="brand-reference-url"
            fieldClassName="wizard-field--span-2"
            label="Brand reference URL · optional"
            type="url"
            value={draft.brandReferenceUrl}
            onChange={(event) => updateField('brandReferenceUrl', event.target.value)}
            error={errors.brandReferenceUrl}
          />
        </div>
      </Panel>
    </div>
  );
}

export function ChannelsStep({ draft, errors, updateField }: StepPanelProps) {
  function toggleChannel(channel: string) {
    const next = toggleBoundedValue(draft.channels, channel, 4);
    updateField('channels', next);
    if (!next.includes(draft.primaryChannel)) {
      updateField('primaryChannel', next[0] ?? '');
    }
  }

  return (
    <div className="wizard-step-stack">
      <Panel>
        <PanelHeading
          icon={Megaphone}
          eyebrow="Distribution"
          title="Choose where the campaign will earn attention"
          description="Select up to four channels. This defines the brief; it does not publish content."
        />
        <fieldset
          className="wizard-choice-field"
          aria-describedby="channels-error"
          aria-invalid={Boolean(errors.channels)}
          tabIndex={errors.channels ? -1 : undefined}
        >
          <legend className="sr-only">Campaign channels</legend>
          <div className="choice-tile-grid choice-tile-grid--three">
            {channelOptions.map((channel) => (
              <ChoiceTile
                key={channel.id}
                name="campaign-channels"
                value={channel.id}
                title={channel.title}
                description={channel.description}
                icon={channel.icon}
                checked={draft.channels.includes(channel.id)}
                onChange={() => toggleChannel(channel.id)}
              />
            ))}
          </div>
          <FieldError id="channels-error">{errors.channels}</FieldError>
        </fieldset>
      </Panel>

      <Panel>
        <div className="wizard-fields wizard-fields--three">
          <Select
            id="primary-channel"
            label="Primary channel"
            value={draft.primaryChannel}
            onChange={(event) => updateField('primaryChannel', event.target.value)}
            error={errors.primaryChannel}
          >
            <option value="">Choose channel</option>
            {draft.channels.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabels[channel] ?? channel}
              </option>
            ))}
          </Select>
          <Select
            id="campaign-duration"
            label="Campaign duration"
            value={draft.campaignDuration}
            onChange={(event) => updateField('campaignDuration', event.target.value)}
            error={errors.campaignDuration}
          >
            <option value="">Choose duration</option>
            <option>Single Launch</option>
            <option>2 Weeks</option>
            <option>4 Weeks</option>
            <option>Always-on</option>
          </Select>
          <Input
            id="destination-url"
            label="Destination URL · optional"
            type="url"
            value={draft.destinationUrl}
            onChange={(event) => updateField('destinationUrl', event.target.value)}
            error={errors.destinationUrl}
          />
        </div>
      </Panel>
    </div>
  );
}

export function CreativeDirectionStep({
  draft,
  errors,
  updateField,
}: StepPanelProps) {
  return (
    <div className="wizard-step-stack">
      <Panel>
        <div className="wizard-panel__title-row">
          <PanelHeading
            icon={Clapperboard}
            eyebrow="Visual language"
            title="Choose the creative system"
          />
          <StatusBadge tone="warning">Human approval required</StatusBadge>
        </div>
          <fieldset
            className="wizard-choice-field"
            aria-describedby="style-error"
            aria-invalid={Boolean(errors.creativeStyle)}
            tabIndex={errors.creativeStyle ? -1 : undefined}
          >
          <legend className="sr-only">Creative style</legend>
          <div className="choice-tile-grid">
            {creativeStyles.map((style) => (
              <ChoiceTile
                key={style.title}
                name="creative-style"
                value={style.title}
                title={style.title}
                description={style.description}
                icon={style.icon}
                checked={draft.creativeStyle === style.title}
                type="radio"
                onChange={() => updateField('creativeStyle', style.title)}
              />
            ))}
          </div>
          <FieldError id="style-error">{errors.creativeStyle}</FieldError>
        </fieldset>
      </Panel>

      <div className="wizard-form-grid">
        <Panel className="wizard-panel--span-5">
          <PanelHeading icon={Flag} eyebrow="Production" title="Pace and format" />
          <Select
            id="creative-energy"
            label="Energy"
            value={draft.creativeEnergy}
            onChange={(event) => updateField('creativeEnergy', event.target.value)}
            error={errors.creativeEnergy}
          >
            <option value="">Choose energy</option>
            <option>Precise & Restrained</option>
            <option>Balanced</option>
            <option>Bold & Kinetic</option>
          </Select>
          <Select
            id="master-duration"
            label="Master duration"
            value={draft.masterDuration}
            onChange={(event) => updateField('masterDuration', event.target.value)}
            error={errors.masterDuration}
          >
            <option value="">Choose duration</option>
            <option>15 seconds</option>
            <option>30 seconds</option>
            <option>60 seconds</option>
          </Select>
          <Select
            id="people-policy"
            label="People on screen"
            value={draft.peoplePolicy}
            onChange={(event) => updateField('peoplePolicy', event.target.value)}
            error={errors.peoplePolicy}
          >
            <option value="">Choose policy</option>
            <option>Product Only</option>
            <option>Client-provided People or Footage</option>
            <option>Synthetic Performer</option>
          </Select>
          {draft.peoplePolicy === 'Synthetic Performer' ? (
            <label
              className={cx(
                'confirmation-row',
                errors.syntheticRightsConfirmed && 'confirmation-row--error',
              )}
            >
              <input
                id="synthetic-rights-confirmed"
                type="checkbox"
                checked={draft.syntheticRightsConfirmed}
                aria-invalid={Boolean(errors.syntheticRightsConfirmed)}
                aria-describedby={
                  errors.syntheticRightsConfirmed
                    ? 'synthetic-rights-error'
                    : undefined
                }
                onChange={(event) =>
                  updateField('syntheticRightsConfirmed', event.target.checked)
                }
              />
              <span>
                I will secure identity and usage rights and approve required AI
                disclosure before release.
              </span>
            </label>
          ) : null}
          <FieldError id="synthetic-rights-error">
            {errors.syntheticRightsConfirmed}
          </FieldError>
        </Panel>

        <Panel className="wizard-panel--span-7">
          <PanelHeading
            icon={WandSparkles}
            eyebrow="Creative boundaries"
            title="What the production must show—and avoid"
          />
          <Textarea
            id="must-show"
            label="Must show"
            rows={5}
            value={draft.mustShow}
            onChange={(event) => updateField('mustShow', event.target.value)}
            error={errors.mustShow}
          />
          <Textarea
            id="avoid-visually"
            label="Avoid visually · optional"
            rows={5}
            value={draft.avoidVisually}
            onChange={(event) => updateField('avoidVisually', event.target.value)}
            error={errors.avoidVisually}
          />
        </Panel>
      </div>
    </div>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  value,
  meta,
  onEdit,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  meta: string;
  onEdit: () => void;
}) {
  return (
    <article className="review-card">
      <span className="review-card__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.7} />
      </span>
      <div className="review-card__copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </article>
  );
}

export function GenerateStep({
  draft,
  errors,
  updateField,
  onEditStep,
}: StepPanelProps & { onEditStep: (step: number) => void }) {
  const selectedChannels = draft.channels
    .map((channel) => channelLabels[channel] ?? channel)
    .join(', ');

  return (
    <div className="wizard-step-stack">
      <Panel>
        <div className="generate-heading-row">
          <PanelHeading
            icon={BadgeCheck}
            eyebrow="Campaign identity"
            title="Name and review the brief"
            description="Cinemoriq will create a structured brief—not publish or spend media."
          />
          <StatusBadge tone="blue">6 sections to review</StatusBadge>
        </div>
        <Input
          id="campaign-name"
          label="Campaign name"
          value={draft.campaignName}
          onChange={(event) => updateField('campaignName', event.target.value)}
          error={errors.campaignName}
        />
      </Panel>

      <div className="review-grid">
        <ReviewCard
          icon={Target}
          title="Intent"
          value={objectiveLabels[draft.objective]}
          meta="Primary campaign outcome"
          onEdit={() => onEditStep(0)}
        />
        <ReviewCard
          icon={Users}
          title="Audience"
          value={draft.audienceName}
          meta={`${draft.audienceType} · ${draft.primaryMarkets.join(', ')} · ${draft.buyingStage}`}
          onEdit={() => onEditStep(1)}
        />
        <ReviewCard
          icon={Package}
          title="Offer"
          value={draft.productName}
          meta={`${draft.primaryCta} · ${draft.keyBenefits.filter(Boolean).length} benefits`}
          onEdit={() => onEditStep(2)}
        />
        <ReviewCard
          icon={Palette}
          title="Brand"
          value={draft.brandName}
          meta={draft.brandTones.join(', ')}
          onEdit={() => onEditStep(3)}
        />
        <ReviewCard
          icon={Globe2}
          title="Channels"
          value={channelLabels[draft.primaryChannel] ?? draft.primaryChannel}
          meta={`${selectedChannels} · ${draft.campaignDuration}`}
          onEdit={() => onEditStep(4)}
        />
        <ReviewCard
          icon={Clapperboard}
          title="Creative Direction"
          value={draft.creativeStyle}
          meta={`${draft.creativeEnergy} · ${draft.masterDuration} · ${draft.peoplePolicy}`}
          onEdit={() => onEditStep(5)}
        />
      </div>

      <Panel className="rights-panel">
        <PanelHeading
          icon={ShieldCheck}
          eyebrow="Rights & review"
          title="Required confirmations"
        />
        {[
          {
            field: 'confirmAssetRights' as const,
            label:
              'I have permission to use all submitted names, logos, assets, and claims.',
          },
          {
            field: 'confirmNoUnauthorizedIdentity' as const,
            label:
              'This campaign does not use an unauthorized identity, celebrity, voice, or protected material.',
          },
          {
            field: 'confirmHumanReview' as const,
            label:
              'I understand every output requires human review before release.',
          },
        ].map((confirmation) => (
          <div key={confirmation.field}>
            <label
              className={cx(
                'confirmation-row',
                errors[confirmation.field] && 'confirmation-row--error',
              )}
            >
              <input
                id={confirmation.field}
                type="checkbox"
                checked={draft[confirmation.field]}
                aria-invalid={Boolean(errors[confirmation.field])}
                aria-describedby={
                  errors[confirmation.field]
                    ? `${confirmation.field}-error`
                    : undefined
                }
                onChange={(event) =>
                  updateField(confirmation.field, event.target.checked)
                }
              />
              <span>{confirmation.label}</span>
            </label>
            <FieldError id={`${confirmation.field}-error`}>
              {errors[confirmation.field]}
            </FieldError>
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function GenerationLoading() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const secondStage = window.setTimeout(() => setActiveStage(1), 550);
    const thirdStage = window.setTimeout(() => setActiveStage(2), 1100);
    return () => {
      window.clearTimeout(secondStage);
      window.clearTimeout(thirdStage);
    };
  }, []);

  return (
    <div className="generation-state" role="status" aria-live="polite">
      <span className="generation-state__orb" aria-hidden="true">
        <WandSparkles size={30} />
      </span>
      <p className="wizard-panel__eyebrow">Local brief preparation</p>
      <h2>Structuring your campaign blueprint</h2>
      <p>
        Cinemoriq is organizing the approved inputs into a structured campaign
        brief draft.
      </p>
      <div className="generation-stages">
        {[
          'Structuring campaign inputs',
          'Applying brand guardrails',
          'Preparing channel brief',
        ].map((stage, index) => (
          <span
            key={stage}
            className={index === activeStage ? 'is-active' : undefined}
          >
            {index < activeStage ? (
              <Check size={14} aria-hidden="true" />
            ) : index === activeStage ? (
              <span className="campaign-save__loader" aria-hidden="true" />
            ) : (
              <span className="generation-stage-dot" aria-hidden="true" />
            )}
            {stage}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildBriefText(draft: CampaignDraft) {
  const supportingChannels = draft.channels.filter(
    (channel) => channel !== draft.primaryChannel,
  );
  const syntheticDisclosure =
    draft.peoplePolicy === 'Synthetic Performer'
      ? draft.syntheticRightsConfirmed
        ? 'Identity rights and AI disclosure confirmed'
        : 'Identity rights and AI disclosure not confirmed'
      : 'No synthetic performer selected';

  return [
    draft.campaignName,
    `Objective: ${objectiveLabels[draft.objective]}`,
    `Audience: ${draft.audienceName} (${draft.audienceType}; ${draft.primaryMarkets.join(', ')}; ${draft.buyingStage})`,
    `Audience profile: ${draft.audienceProfile}`,
    `Audience need: ${draft.audiencePain}`,
    `Offer: ${draft.productName} — ${draft.valueProposition}`,
    `Benefits: ${draft.keyBenefits.filter(Boolean).join('; ')}`,
    `CTA: ${draft.primaryCta}`,
    `Offer reference: ${draft.productUrl || 'Not provided'}`,
    `Proof and claim limits: ${draft.proofConstraints || 'Not provided'}`,
    `Brand: ${draft.brandName} — ${draft.brandTones.join(', ')}`,
    `Brand voice: ${draft.brandVoice}`,
    `Required messages: ${draft.requiredMessages || 'Not provided'}`,
    `Brand exclusions: ${draft.brandAvoid || 'Not provided'}`,
    `Brand reference: ${draft.brandReferenceUrl || 'Not provided'}`,
    `Primary channel: ${channelLabels[draft.primaryChannel] ?? draft.primaryChannel}`,
    `Supporting channels: ${supportingChannels.length ? supportingChannels.map((channel) => channelLabels[channel] ?? channel).join(', ') : 'None'}`,
    `Campaign duration: ${draft.campaignDuration}`,
    `Destination URL: ${draft.destinationUrl || 'Not provided'}`,
    `Creative: ${draft.creativeStyle}; ${draft.creativeEnergy}; ${draft.masterDuration}; ${draft.peoplePolicy}`,
    `Must show: ${draft.mustShow}`,
    `Avoid: ${draft.avoidVisually || 'No additional visual exclusions'}`,
    `Rights: Submitted assets and claims confirmed; unauthorized identity exclusion confirmed; ${syntheticDisclosure}.`,
    'Status: Draft — human review required before release.',
  ].join('\n');
}

export function GenerationSuccess({
  draft,
  onEdit,
  onStartNew,
  onReturn,
}: {
  draft: CampaignDraft;
  onEdit: () => void;
  onStartNew: () => void;
  onReturn: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyBrief() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(buildBriefText(draft));
      setCopyStatus('copied');
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopyStatus('idle');
        copyTimerRef.current = null;
      }, 1600);
    } catch {
      setCopyStatus('error');
    }
  }

  const supportingChannelCount = Math.max(0, draft.channels.length - 1);
  const syntheticDisclosure =
    draft.peoplePolicy === 'Synthetic Performer'
      ? draft.syntheticRightsConfirmed
        ? 'Identity rights & AI disclosure confirmed'
        : 'Identity rights & AI disclosure required'
      : 'No synthetic performer selected';

  return (
    <div className="campaign-success" role="status" aria-live="polite">
      <span className="campaign-success__icon" aria-hidden="true">
        <CheckCircle2 size={34} strokeWidth={1.6} />
      </span>
      <p className="wizard-panel__eyebrow">Campaign brief ready</p>
      <h1 ref={headingRef} tabIndex={-1}>
        {draft.campaignName}
      </h1>
      <p>
        Cinemoriq has structured the campaign inputs into a production draft. A
        human must still approve every creative and claim before release.
      </p>
      <StatusBadge tone="warning">Draft · Human review required</StatusBadge>

      <div className="campaign-success__metrics">
        <span>
          <strong>{objectiveLabels[draft.objective]}</strong>
          <small>Objective</small>
        </span>
        <span>
          <strong>{draft.channels.length}</strong>
          <small>Channels</small>
        </span>
        <span>
          <strong>{draft.masterDuration}</strong>
          <small>Master format</small>
        </span>
      </div>

      <div className="campaign-success__summary">
        <span>
          <Users size={17} />
          <strong>Audience</strong>
          <small>
            {draft.audienceName} · {draft.audienceType} ·{' '}
            {draft.primaryMarkets.join(', ')} · {draft.buyingStage}
          </small>
        </span>
        <span>
          <Package size={17} />
          <strong>Offer</strong>
          <small>
            {draft.productName} · {draft.primaryCta} ·{' '}
            {draft.keyBenefits.filter(Boolean).length} benefits
          </small>
        </span>
        <span>
          <MessageSquareText size={17} />
          <strong>Brand</strong>
          <small>
            {draft.brandName} · {draft.brandTones.join(', ')}
          </small>
        </span>
        <span>
          <Globe2 size={17} />
          <strong>Distribution</strong>
          <small>
            {channelLabels[draft.primaryChannel] ?? draft.primaryChannel} ·{' '}
            {supportingChannelCount} supporting · {draft.campaignDuration}
          </small>
        </span>
        <span>
          <Clapperboard size={17} />
          <strong>Creative</strong>
          <small>
            {draft.creativeStyle} · {draft.creativeEnergy} ·{' '}
            {draft.masterDuration} · {draft.peoplePolicy}
          </small>
        </span>
        <span>
          <ShieldCheck size={17} />
          <strong>Guardrails</strong>
          <small>Rights confirmed · {syntheticDisclosure}</small>
        </span>
      </div>

      <div className="campaign-success__actions">
        <Button variant="secondary" onClick={onEdit}>
          Edit brief
        </Button>
        <Button
          variant="secondary"
          leadingIcon={
            copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />
          }
          onClick={copyBrief}
        >
          {copyStatus === 'copied'
            ? 'Copied'
            : copyStatus === 'error'
              ? 'Copy failed'
              : 'Copy brief'}
        </Button>
        <Button variant="secondary" onClick={onStartNew}>
          Start new campaign
        </Button>
        <Button variant="primary" onClick={onReturn}>
          Back to Command Center
        </Button>
      </div>
      <p className="campaign-copy-status" aria-live="polite">
        {copyStatus === 'error'
          ? 'Clipboard access was unavailable. Try again after allowing clipboard permission.'
          : ''}
      </p>
    </div>
  );
}
