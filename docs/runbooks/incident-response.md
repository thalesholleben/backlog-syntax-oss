# Personal-data incident response

## Objective

Contain and document a suspected security incident involving personal data, then decide whether notification is legally required.

## Prerequisites

- incident owner: Thales Gomes / Syntax Lab; private contact: contato@syntaxlab.com.br;
- access to sanitized application, audit, infrastructure, and provider logs;
- current data inventory and subprocessors list.

## Steps

1. Open a private incident record with UTC timestamps and a correlation identifier.
2. Classify affected systems, tenants, data categories, subjects, volume, and active risk.
3. Contain access without destroying evidence. Revoke exposed credentials and isolate affected components.
4. Preserve relevant logs and record every administrative action. Do not copy secrets into the incident record.
5. Determine root cause, duration, unauthorized recipients, and likely consequences.
6. Consult the applicable ANPD criteria and legal reviewer to decide whether and how to notify the authority and affected subjects.
7. Eradicate the cause, restore service from verified state, and monitor for recurrence.
8. Record the decision, including incidents not notified, and convert corrective actions into tracked work.

## Validation

- containment is proven, not inferred;
- exposed credentials no longer authenticate;
- tenant isolation and authorization regression tests pass;
- the event timeline, impact, decision, and owner are complete.

## Rollback

Security containment is not rolled back until the replacement control is verified. A service rollback must not reactivate an exposed key, vulnerable image, or unsafe database role.

## Open production requirements

Provider escalation: authenticated Hostinger/Cloudflare/Google support under the owner's
existing accounts. Legal advice is obtained for incidents requiring notification; no retained
legal reviewer or automated legal decision is claimed. Review minimized incident records after
180 days, retain longer when legally required, and document the reason. Communications include
confirmed facts, affected data, containment, recommended action and the private contact; do not
speculate about impact or publish identifying records. Launch recovery rehearsal exercised
containment (no public route), restoration and isolation; this is not a full incident simulation.
