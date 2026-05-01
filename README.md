# 4Operations — EURES Monitor

Actor Apify que monitoriza vagas no EURES automaticamente.

## O que faz
- Corre todos os dias às 7h automaticamente
- Extrai apenas vagas NOVAS (nunca duplica)
- Extrai emails, telefones e dados das empresas
- Envia relatório diário por email

## Configuração no Apify
Depois de fazer deploy, preenche no Input:
- `emailTo` — email do cliente
- `smtpHost` — smtp.gmail.com
- `smtpUser` — teu Gmail
- `smtpPass` — App Password do Gmail

## Schedule
Cron para correr todos os dias às 7h: `0 7 * * *`
