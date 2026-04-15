## Структура

Каждый шрифт — своя папка и свой файл с `@font-face` (как у `hamiltoneg`):

| Папка       | Файл подключения        | Файлы начертания |
|------------|-------------------------|------------------|
| `hamiltoneg/` | `mr_hamiltoneg.css`  | `mr_hamiltoneg.*` (eot, woff2, woff, ttf, svg) |
| `felidae/`    | `felidae.css`        | `Felidae.woff` |
| `atziluth/`   | `atziluth.css`       | `Atziluth_Script.otf` |

Сводное подключение: `src/assets/styles/fonts.scss` (импортирует все три CSS).

### Примечания

- `Atziluth` — коммерческий шрифт; используйте в соответствии с вашей лицензией.
