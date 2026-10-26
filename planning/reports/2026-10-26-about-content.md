# Personal About page and punctuation update

The About page now explains how Avinash's experiences shaped his perspective, rather than leading with education and skill inventories.

## Content

- Opens with curiosity across design, technology, business and human behaviour.
- Connects College Fest and AIESEC to understanding stakeholder priorities.
- Connects UX study and Yapita Health to examining customer journeys and assumptions.
- Connects Cordelia Cruises and Chat360 to understanding customers and internal teams together.
- Connects Nosh House to responsibility for service, retention and business viability.
- Connects Events Fusion to communicating ideas for different audiences.
- Connects continuing education and certifications to practical decisions.
- Explains philomath and metacognist through curiosity, reflection and questions asked before making decisions.
- Retains education and certifications, with links to interests, work and contact.

The personal interpretation follows the user's own explanation. Career details come from existing portfolio records. LinkedIn could not be scraped: the environment's network proxy returned HTTP 403. This is not a full LinkedIn profile audit, and no additional LinkedIn claims were introduced.

## Presentation

Experience reflections use a two-column desktop grid and a single-column mobile layout, with padded cards and existing page gutters. Literal and encoded em dashes were removed from the authored site and build wrapper, including metadata, dates, headings and accessibility copy. Sentence punctuation replaces prose interruptions; date ranges and title separators use hyphens. The date-label parser uses the same new separator.

## Validation

The generated site builds successfully. Journey tests pass at six viewport widths, including navigation, headings, overflow, résumé links, loader behaviour and assistant fallbacks. A 393px browser check found no horizontal overflow and no em dashes in rendered About text; the mobile layout was visually inspected. Source and generated output contain no literal or encoded em dashes.
