import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShipmentDto {
  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;
}
