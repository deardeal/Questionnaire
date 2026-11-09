-- Remove only the two synthetic launch verification submissions (before enrollment opened).
DELETE FROM respondents WHERE id IN ('2a32b00d-fb49-40b7-ac2d-652ca64dc537', 'b34598ee-f926-4dac-a5b2-111aa4ff53d9') AND ((identity='student' AND demographics->>'studentId' LIKE 'QA%') OR (identity='public' AND demographics->>'job'='服務業'));
