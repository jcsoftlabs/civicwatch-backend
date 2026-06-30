import { PartialType } from '@nestjs/swagger';
import { CreateSearchProviderConnectionDto } from './create-search-provider-connection.dto';

export class UpdateSearchProviderConnectionDto extends PartialType(
  CreateSearchProviderConnectionDto,
) {}
