import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateShipmentDto {
  @IsNotEmpty()
  senderName: string;

  @IsNotEmpty()
  pickupAddress: string;

  @IsNotEmpty()
  receiverName: string;

  @IsNotEmpty()
  deliveryAddress: string;

  @IsNumber()
  @Min(0.1)
  weight: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;
}
