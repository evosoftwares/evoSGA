-- Remove sales tags functionality
-- Drop tables in correct order to avoid foreign key constraints

-- Drop junction table first
DROP TABLE IF EXISTS public.sales_opportunity_tags;

-- Drop main sales_tags table
DROP TABLE IF EXISTS public.sales_tags;