import { PartialType } from '@nestjs/swagger';
import { CreateXSearchRuleDto } from './create-x-search-rule.dto';

export class UpdateXSearchRuleDto extends PartialType(CreateXSearchRuleDto) {}
