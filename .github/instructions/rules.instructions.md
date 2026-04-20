---
description: Aply this rules to all prompts
---
# Rules

* Environment variables must ALWAYS follow this naming structure:
  * CM_[function e.g.: `USERS`, `RESERVAS`]_[REST_OF_VARIABLE_NAME]
  * all uppercase
  * All variables calls centralized in "backend/utils/config.py" 
* No "dev_mode" anywhere
* No emojis
* No documentation, except README.MD
* No tests
* No comments in the code
* The fewer lines per file, the BETTER
* The fewer files, the BETTER
* Whenever logic is repeated, use "utils" (or components) to avoid duplication
* ALWAYS USE CLEANCODE
* ALWAYS WRITE IN PORTUGUESE, BRASILIAN - with corrects signals

* ALWAYS USE THIS INPUT IN FRONTEND:

```tsx
<fieldset className="fieldset">
  <legend className="fieldset-legend">What is your name?</legend>
  <input type="text" className="input" placeholder="Type here" />
  <p className="label">Optional</p>
</fieldset>
```