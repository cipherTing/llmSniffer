import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MONITOR_INTERVAL_OPTIONS,
  PROVIDER_TAGS,
  REQUEST_TEMPLATE_IDS,
  SPONSOR_TIERS,
  type ProviderTag,
  type SponsorTier,
} from '../admin.constants';

export class SiteProbeDto {
  @IsString()
  @IsIn(REQUEST_TEMPLATE_IDS)
  requestTemplateId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(8, 2048)
  baseUrl!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @Length(1, 2048)
  apiKey!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @Length(1, 120)
  modelName!: string;
}

export class CreateSiteDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @Length(1, 80)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(8, 2048)
  url!: string;

  @IsString()
  @IsIn(SPONSOR_TIERS)
  sponsorTier!: SponsorTier;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  @IsIn(MONITOR_INTERVAL_OPTIONS)
  monitorIntervalSeconds!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(PROVIDER_TAGS, { each: true })
  providers!: ProviderTag[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SiteProbeDto)
  probes!: SiteProbeDto[];
}

export class UpdateSiteDto extends CreateSiteDto {}
