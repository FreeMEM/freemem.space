#!/usr/bin/env python3
"""
Rescata los artículos de old.tapiasbravo.com (Mambo, 2004-2008) de las capturas
de la Wayback Machine y los deja en un JSON listo para importar en WordPress.

    mambo_extraer.py <carpeta> <salida.json>

En <carpeta>/raw van las capturas <tipo>-<id>-<timestamp>.html (tipo: art o blog),
bajadas con el sufijo id_ de la Wayback Machine, que da el HTML original sin su
barra. En <carpeta>/pdf, los PDF de artículos ya pasados a texto con pdftotext.

Aquel Mambo llegó a tener malware, así que el HTML se trata como hostil: solo se
conservan etiquetas de texto de una lista blanca, sin atributos salvo href/src/alt,
y se tira cualquier elemento oculto, script, iframe, object o formulario. Lo que se
quita se apunta en «avisos» para revisarlo antes de importar.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup, Comment

PERMITIDAS = {'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'blockquote',
              'h2', 'h3', 'h4', 'pre', 'code', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'}
PELIGROSAS = {'script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'meta',
              'noscript', 'applet', 'frame', 'frameset', 'textarea', 'button', 'select'}
OCULTO = re.compile(r'display\s*:\s*none|visibility\s*:\s*hidden|left\s*:\s*-\d{3,}|font-size\s*:\s*0|height\s*:\s*0', re.I)


def fecha(texto):
    """Mambo pinta «01.10.2004» o «Martes, 01 Octubre 2004», a veces con hora"""
    t = ' '.join(texto.split())
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?', t)
    if m:
        d, mo, a, h, mi = m.groups()
        return datetime(int(a), int(mo), int(d), int(h or 12), int(mi or 0))
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
             'septiembre', 'octubre', 'noviembre', 'diciembre']
    m = re.search(r'(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})(?:\s+(\d{1,2}):(\d{2}))?', t, re.I)
    if m and m.group(2).lower() in meses:
        d, mes, a, h, mi = m.groups()
        return datetime(int(a), meses.index(mes.lower()) + 1, int(d), int(h or 12), int(mi or 0))
    return None


def limpiar(nodo, avisos):
    for c in nodo.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for el in list(nodo.find_all(True)):
        if el.decomposed if hasattr(el, 'decomposed') else False:
            continue
        nombre = el.name.lower()
        if nombre in PELIGROSAS:
            avisos.append(f'quitado <{nombre}>: {str(el)[:120]}')
            el.decompose()
            continue
        if OCULTO.search(el.get('style', '') or ''):
            avisos.append(f'quitado elemento oculto: {str(el)[:160]}')
            el.decompose()
            continue
        if nombre not in PERMITIDAS:
            el.unwrap()
            continue
        attrs = {}
        if nombre == 'a':
            href = (el.get('href') or '').strip()
            if href.startswith(('http://', 'https://', 'mailto:')) and 'javascript' not in href.lower():
                attrs['href'] = href
        if nombre == 'img':
            src = (el.get('src') or '').strip()
            if src.startswith(('http://', 'https://', '/', 'images/')):
                attrs['src'] = src
            attrs['alt'] = (el.get('alt') or '').strip()
        el.attrs = attrs
        if nombre == 'a' and not attrs:
            el.unwrap()
    return nodo


def articulos(html, avisos):
    """Todas las piezas de una página de com_content: la de un artículo trae una,
    la portada y las secciones traen varias (a veces solo el comienzo)."""
    s = BeautifulSoup(html, 'html.parser')
    piezas = []
    for cab in s.find_all('td', class_='contentheading'):
        titulo = ' '.join(cab.get_text(' ').split())
        t = cab.find_parent('table').find_next_sibling('table', class_='contentpaneopen')
        if not titulo or t is None:
            continue
        filas = [tr for tr in t.find_all('tr') if tr.find_parent('table') is t]
        autor = f = cuerpo = None
        parcial = False
        for tr in filas:
            td = tr.find('td')
            if td is None:
                continue
            clases = td.get('class') or []
            if 'createdate' in clases:
                f = fecha(td.get_text(' '))
            elif 'modifydate' in clases:
                continue
            elif td.find('span', class_='small') and autor is None:
                m = re.search(r'(?:Contribuido|Escrito) por\s+(.+)', ' '.join(td.get_text(' ').split()))
                autor = m.group(1).strip() if m else ''
            elif td.find('a', class_='readon'):
                parcial = True
            elif cuerpo is None and td.get_text(strip=True):
                cuerpo = td
        if cuerpo is None:
            continue
        # El bloque de comentarios (akocomment) y lo que le sigue no es del artículo
        for marca in cuerpo.find_all(['img', 'a'], src=re.compile('akocomment')) + cuerpo.find_all('a', href=re.compile('akocomment')):
            for resto in list(marca.find_all_next()):
                if cuerpo in resto.parents:
                    resto.decompose()
            marca.decompose()
        limpiar(cuerpo, avisos)
        texto = cuerpo.decode_contents().strip()
        texto = re.sub(r'(?:Escribe|Escribir) (?:un )?comentario.*$', '', texto, flags=re.S | re.I).strip()
        if '<p' not in texto:
            partes = [x.strip() for x in re.split(r'(?:\r?\n){2,}|(?:<br\s*/?>\s*){2,}', texto) if x.strip()]
            texto = '\n'.join(f'<p>{x}</p>' for x in partes)
        piezas.append({'titulo': titulo, 'fecha': f.isoformat() if f else None, 'autor': autor,
                       'html': texto, 'parcial': parcial})
    return piezas


def pdf(texto, avisos):
    """El PDF de Mambo: título, «(fecha) - Escrito por X - Ultima modificación», cuerpo y pie"""
    lineas = texto.replace('\f', '\n').split('\n')
    lineas = [l.rstrip() for l in lineas]
    while lineas and not lineas[0].strip():
        lineas.pop(0)
    if len(lineas) < 3:
        return []
    titulo = lineas[0].strip()
    cab = lineas[1]
    f = fecha(cab)
    m = re.search(r'(?:Contribuido|Escrito) por\s+(.+?)\s+-\s+Ultima', cab)
    cuerpo = []
    for l in lineas[2:]:
        if 'old.tapiasbravo.com - La bit' in l or re.match(r'^\s*Generado:', l):
            break
        cuerpo.append(l)
    parrafos, actual = [], []
    for l in cuerpo:
        if l.strip():
            actual.append(l.strip())
        elif actual:
            parrafos.append(' '.join(actual)); actual = []
    if actual:
        parrafos.append(' '.join(actual))
    from html import escape
    html = '\n'.join(f'<p>{escape(x)}</p>' for x in parrafos)
    html = re.sub(r'(https?://[^\s<]+)', r'<a href="\1">\1</a>', html)
    return [{'titulo': titulo, 'fecha': f.isoformat() if f else None, 'autor': m.group(1).strip() if m else '',
             'html': html, 'parcial': False}]


def blog(html, avisos):
    """Una entrada de com_mamblog (el «blog de usuarios», donde escribían otros)"""
    s = BeautifulSoup(html, 'html.parser')
    cab = s.find('td', class_='componentheading')
    creado = s.find('td', class_='createdate')
    if not cab or not creado:
        return None
    titulo = ' '.join(cab.get_text(' ').split())
    t = ' '.join(creado.get_text(' ').split())
    m = re.search(r'Escrito por\s+(.+)$', t)
    cuerpo = creado.find_parent('tr').find_next_sibling('tr')
    cuerpo = cuerpo.find('td') if cuerpo else None
    if cuerpo is None:
        return None
    limpiar(cuerpo, avisos)
    texto = cuerpo.decode_contents().strip()
    partes = [x.strip() for x in re.split(r'(?:\r?\n\s*){2,}|(?:<br\s*/?>\s*){2,}', texto) if x.strip()]
    texto = '\n'.join(f'<p>{x}</p>' for x in partes)
    f = fecha(t)
    return {'titulo': titulo, 'fecha': f.isoformat() if f else None, 'autor': m.group(1).strip() if m else '',
            'html': texto}


def main():
    carpeta, salida = Path(sys.argv[1]), Path(sys.argv[2])
    piezas = {}

    def guardar(r, tipo, ident, ts, avisos):
        if not r['html'] or not r['titulo'] or not r['fecha']:
            return
        r.update(tipo=tipo, id=ident, captura=ts, avisos=list(avisos))
        clave = (r['titulo'].lower(), r['fecha'][:10])
        previa = piezas.get(clave)
        # Se queda la versión completa más antigua: el malware, si lo hubo, llegó
        # después. Un artículo de su propia página gana a uno visto en un listado.
        if previa is None or (previa['parcial'] and not r['parcial']):
            piezas[clave] = r
        elif not r['parcial'] and len(r['html']) > len(previa['html']) * 1.2:
            previa['avisos'].append(f'la captura {ts} es más larga ({len(r["html"])} frente a {len(previa["html"])})')
        if previa is not None and previa['autor'] == '' and r['autor']:
            piezas[clave]['autor'] = r['autor']

    for f in sorted(carpeta.glob('raw/*.html')):
        tipo, ident, ts = f.stem.split('-')
        crudo = f.read_bytes()
        html = crudo.decode('utf-8') if b'charset=utf-8' in crudo[:2000].lower() else crudo.decode('cp1252', errors='replace')
        avisos = []
        if tipo == 'art':
            todas = articulos(html, avisos)
        else:
            b = blog(html, avisos)
            todas = [dict(b, parcial=False)] if b else []
        for r in todas:
            # En una portada o un listado el id de la URL no es el de cada pieza
            guardar(r, tipo, int(ident) if len(todas) == 1 else None, ts, avisos)

    for f in sorted(carpeta.glob('pdf/*.txt')):
        _, ident, ts = f.stem.split('-')
        avisos = []
        for r in pdf(f.read_text(), avisos):
            guardar(r, 'pdf', int(ident), ts, avisos)

    resultado = sorted(piezas.values(), key=lambda p: p['fecha'])
    salida.write_text(json.dumps(resultado, ensure_ascii=False, indent=1))
    print(f'{len(resultado)} piezas; solo el comienzo: {sum(1 for p in resultado if p["parcial"])}; '
          f'con avisos: {sum(1 for p in resultado if p["avisos"])}')


if __name__ == '__main__':
    main()
