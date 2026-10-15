// Where each translation's text comes from:
//  - 'yv'    → YouVersion Platform API (needs a free App Key; this is the only legal free route to the NIV)
//  - 'bolls' → bolls.life (free, no key)
export const TRANSLATIONS = [
  {
    id: 'NIV',
    name: 'New International Version',
    note: 'NIV 2011',
    source: 'yv',
    yv: 111,
    copyright:
      'Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.',
  },
  {
    id: 'NIVUK',
    name: 'NIV (Anglicised)',
    note: 'British spelling',
    source: 'yv',
    yv: 113,
    copyright:
      'Scripture quotations taken from The Holy Bible, New International Version® Anglicised, NIV®. Copyright © 1979, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.',
  },
  { id: 'ESV', name: 'English Standard Version', source: 'bolls', code: 'ESV', copyright: 'ESV® Bible © 2001 by Crossway, a publishing ministry of Good News Publishers.' },
  { id: 'NKJV', name: 'New King James Version', source: 'bolls', code: 'NKJV', copyright: 'New King James Version® © 1982 by Thomas Nelson.' },
  { id: 'NLT', name: 'New Living Translation', source: 'bolls', code: 'NLT', copyright: 'Holy Bible, New Living Translation © 1996, 2004, 2015 by Tyndale House Foundation.' },
  { id: 'CSB', name: 'Christian Standard Bible', source: 'bolls', code: 'CSB17', copyright: 'Christian Standard Bible® © 2017 by Holman Bible Publishers.' },
  { id: 'NASB', name: 'New American Standard Bible', note: '1995', source: 'bolls', code: 'NASB', copyright: 'New American Standard Bible® © 1960–1995 by The Lockman Foundation.' },
  { id: 'LSB', name: 'Legacy Standard Bible', source: 'bolls', code: 'LSB', copyright: 'Legacy Standard Bible® © 2021 by The Lockman Foundation.' },
  { id: 'NET', name: 'New English Translation', source: 'bolls', code: 'NET', copyright: 'NET Bible® © 1996–2019 by Biblical Studies Press, L.L.C.' },
  { id: 'AMP', name: 'Amplified Bible', source: 'bolls', code: 'AMP', copyright: 'Amplified® Bible © 2015 by The Lockman Foundation.' },
  { id: 'MSG', name: 'The Message', source: 'bolls', code: 'MSG', copyright: 'THE MESSAGE © 1993, 2002, 2018 by Eugene H. Peterson.' },
  { id: 'KJV', name: 'King James Version', source: 'bolls', code: 'KJV', copyright: 'Public domain.' },
  { id: 'BSB', name: 'Berean Standard Bible', source: 'bolls', code: 'BSB', copyright: 'Public domain.' },
  { id: 'WEB', name: 'World English Bible', source: 'bolls', code: 'WEB', copyright: 'Public domain.' },
];

export const TRANSLATION_BY_ID = Object.fromEntries(TRANSLATIONS.map((t) => [t.id, t]));

export const getTranslation = (id) => TRANSLATION_BY_ID[id] || TRANSLATION_BY_ID.ESV;
