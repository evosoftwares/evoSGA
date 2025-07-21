-- Função para mover oportunidades de vendas entre colunas
CREATE OR REPLACE FUNCTION move_sales_opportunity(
    p_opportunity_id uuid,
    p_new_column_id uuid,
    p_new_position integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    old_column_id uuid;
    old_position integer;
BEGIN
    -- Obter a coluna e posição atuais da oportunidade
    SELECT column_id, position INTO old_column_id, old_position
    FROM sales_opportunities
    WHERE id = p_opportunity_id;

    -- Se não encontrou a oportunidade, sair
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Oportunidade não encontrada: %', p_opportunity_id;
    END IF;

    -- Se está movendo para a mesma coluna
    IF old_column_id = p_new_column_id THEN
        -- Ajustar posições na mesma coluna
        IF old_position < p_new_position THEN
            -- Movendo para baixo: decrementar posições entre old_position e new_position
            UPDATE sales_opportunities 
            SET position = position - 1
            WHERE column_id = p_new_column_id 
            AND position > old_position 
            AND position <= p_new_position
            AND id != p_opportunity_id;
        ELSIF old_position > p_new_position THEN
            -- Movendo para cima: incrementar posições entre new_position e old_position
            UPDATE sales_opportunities 
            SET position = position + 1
            WHERE column_id = p_new_column_id 
            AND position >= p_new_position 
            AND position < old_position
            AND id != p_opportunity_id;
        END IF;
    ELSE
        -- Movendo para coluna diferente
        
        -- Decrementar posições na coluna de origem (após a posição antiga)
        UPDATE sales_opportunities 
        SET position = position - 1
        WHERE column_id = old_column_id 
        AND position > old_position
        AND id != p_opportunity_id;
        
        -- Incrementar posições na coluna de destino (a partir da nova posição)
        UPDATE sales_opportunities 
        SET position = position + 1
        WHERE column_id = p_new_column_id 
        AND position >= p_new_position;
    END IF;

    -- Atualizar a oportunidade com a nova coluna e posição
    UPDATE sales_opportunities 
    SET 
        column_id = p_new_column_id,
        position = p_new_position,
        updated_at = NOW()
    WHERE id = p_opportunity_id;
END;
$$;