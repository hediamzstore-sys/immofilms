import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const PLANS = ['Vidéo Express', 'Vidéo Premium', 'Pack Agence'] as const;

export class CreateContactDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100, { message: 'Merci d’indiquer votre nom.' })
  nom!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[+()\d\s.\-]{6,25}$/, { message: 'Le numéro de téléphone semble invalide.' })
  telephone!: string;

  @Transform(trim)
  @IsEmail({}, { message: 'L’adresse email semble invalide.' })
  @MaxLength(160)
  email!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(3000, { message: 'Le message est trop long (3000 caractères maximum).' })
  message?: string;

  @IsOptional()
  @IsIn(PLANS as unknown as string[])
  formule?: string;

  /** Champ piège invisible : rempli uniquement par les robots. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
