import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class FieldResponseInputDto {
  @IsUUID()
  formQuestionId!: string;

  // Deliberately untyped beyond "present" — a field's value can legitimately be a string, number,
  // boolean or array depending on its field type (same reasoning as forms/upsert-draft-form.dto).
  @IsNotEmpty()
  valueJson!: unknown;
}

export class SubmitMilestoneDto {
  // Client-generated idempotency key (see FormResponse's @@unique([deviceId, clientRef])) — the
  // same offline submission retried after a connectivity blip must never create a duplicate.
  @IsString()
  @IsNotEmpty()
  clientRef!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FieldResponseInputDto)
  fieldResponses!: FieldResponseInputDto[];
}
