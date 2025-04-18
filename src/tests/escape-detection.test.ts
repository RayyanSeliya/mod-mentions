import { describe, expect, test } from '@jest/globals';

function testModeratorMention(text: string, moderator: string, requirePrefix: boolean = true): boolean {
  const escapedModerator = moderator.replace(/_/g, '(?:\\\\_|_)');
  const search = (requirePrefix ? "" : "?") + escapedModerator;
  const regex = new RegExp(
    `(^|[^a-zA-Z0-9_\\/])(\\/?u\\/)${search}($|[^a-zA-Z0-9_\\/])`,
    'i'
  );
  return regex.test(text);
}

describe('Moderator Mention Detection', () => {
  test('should detect regular username mentions', () => {
    expect(testModeratorMention('Hey u/normal_user what\'s up', 'normal_user')).toBe(true);
  });

  test('should detect escaped underscore mentions', () => {
    expect(testModeratorMention('Hey u/the\\_danish\\_dane check this', 'the_danish_dane')).toBe(true);
  });

  test('should detect unescaped underscore mentions', () => {
    expect(testModeratorMention('Hey u/the_danish_dane check this', 'the_danish_dane')).toBe(true);
  });

  test('should not detect partial matches', () => {
    expect(testModeratorMention('Hey u/the_danish_dane_extra check this', 'the_danish_dane')).toBe(false);
  });

  test('should handle mixed escaped and unescaped underscores', () => {
    expect(testModeratorMention('Hey u/the_danish\\_dane check this', 'the_danish_dane')).toBe(true);
  });
});


