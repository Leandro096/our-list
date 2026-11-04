/**
 * Ready-made save-the-date messages for WhatsApp.
 *
 * Placeholders: {nombre} (guest's first name), {pareja}, {fecha} and {enlace} (their personal link).
 * `lang` is the language of the message itself, which is not always the language of the dashboard:
 * guests abroad may need the English version even when the couple works in Spanish.
 *
 * Every message is built from the same four pieces (greeting, announcement, call to action, closing),
 * so all versions say the same thing and only change in language and tone. Guests abroad get one
 * extra piece, the early notice about flights. To change what the messages say, edit the pieces
 * below; to change one message for one audience, use the editor in the dashboard.
 */

export type MessageLang = 'es' | 'en';
export type MessageTone = 'formal' | 'warm';
export type MessageAudience = 'abroad' | 'local';

export interface MessageOption {
  id: string;
  lang: MessageLang;
  audience: MessageAudience;
  tone: MessageTone;
  /** Key under `invitations.messages` for the label shown in menus. */
  labelKey: string;
  body: string;
}

interface Pieces {
  greeting: string;
  announcement: string;
  /** Only sent to guests who live abroad. */
  earlyNotice: string;
  callToAction: string;
  closing: string;
}

const PIECES: Record<MessageLang, Record<MessageTone, Pieces>> = {
  es: {
    formal: {
      greeting: 'Querido {nombre},',
      announcement:
        'Con gran alegría le anunciamos que nos casamos el {fecha}, un día que marcará nuestras vidas para siempre y que será aún más especial si podemos compartirlo con usted.',
      earlyNotice:
        'Sabemos que, para algunos invitados, el viaje requiere preparación. Por eso le escribimos con tanta anticipación: para que pueda comparar opciones de vuelo y organizarse con calma.',
      callToAction: 'Aparte la fecha y confirme su asistencia aquí:\n{enlace}',
      closing: 'Un abrazo,\n{pareja}',
    },
    warm: {
      greeting: '¡Hola {nombre}! 🤍',
      announcement:
        '¡Estamos felices y queremos que lo sepas primero! Nos casamos el {fecha}, un día que va a marcar nuestras vidas para siempre, y no imaginamos vivirlo sin ti.',
      earlyNotice:
        'Te avisamos con tiempo porque sabemos que venir de fuera toma planificación: así puedes mirar vuelos, comparar precios y escoger lo que mejor te quede.',
      callToAction: 'Aparta la fecha y cuéntanos si puedes venir:\n{enlace}',
      closing: '¡Un abrazo grande!\n{pareja}',
    },
  },
  en: {
    formal: {
      greeting: 'Dear {nombre},',
      announcement:
        'With great joy, we are writing to tell you that we are getting married on {fecha}, a day that will change our lives forever and one we would be honored to share with you.',
      earlyNotice:
        'We know that for some guests the trip takes planning, so we are writing well in advance. That way you can compare flights and organize your travel without rush.',
      callToAction: 'Please save the date and let us know if you can join us:\n{enlace}',
      closing: 'With love,\n{pareja}',
    },
    warm: {
      greeting: 'Hi {nombre}! 🤍',
      announcement:
        'We are so happy and wanted you to hear it from us first! We are getting married on {fecha}, a day that will change our lives forever, and we cannot imagine it without you.',
      earlyNotice:
        'We are telling you early because we know coming from abroad takes some planning. You will have plenty of time to look at flights and pick what works best.',
      callToAction: 'Save the date and tell us if you can make it:\n{enlace}',
      closing: 'Big hug,\n{pareja}',
    },
  },
};

function build(lang: MessageLang, tone: MessageTone, audience: MessageAudience): string {
  const p = PIECES[lang][tone];
  const parts =
    audience === 'abroad'
      ? [p.greeting, p.announcement, p.earlyNotice, p.callToAction, p.closing]
      : [p.greeting, p.announcement, p.callToAction, p.closing];
  return parts.join('\n\n');
}

const AUDIENCES: MessageAudience[] = ['abroad', 'local'];
const LANGS: MessageLang[] = ['es', 'en'];
const TONES: MessageTone[] = ['formal', 'warm'];

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export const MESSAGE_OPTIONS: MessageOption[] = AUDIENCES.flatMap((audience) =>
  LANGS.flatMap((lang) =>
    TONES.map((tone) => ({
      id: `${audience}-${lang}-${tone}`,
      lang,
      audience,
      tone,
      // e.g. abroadEsFormal, localEnWarm
      labelKey: `${audience}${cap(lang)}${cap(tone)}`,
      body: build(lang, tone, audience),
    }))
  )
);

export const DEFAULT_MESSAGE_ID = MESSAGE_OPTIONS[0].id;

export function findMessageOption(id: string): MessageOption {
  return MESSAGE_OPTIONS.find((option) => option.id === id) ?? MESSAGE_OPTIONS[0];
}
