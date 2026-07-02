import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @Length(1, 256)
  bootstrapToken!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @Length(3, 64)
  username!: string;

  @IsString()
  @MinLength(8)
  @Length(8, 128)
  password!: string;
}
