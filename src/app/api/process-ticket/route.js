import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(request) {
  try {
    const data = await request.json();
    const { image } = data;
    
    if (!image) {
      return NextResponse.json(
        { error: 'No se proporcionó ninguna imagen' },
        { status: 400 }
      );
    }

    // Quitar el prefijo de datos URI si existe
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Verificar la clave API
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Clave API de Anthropic no configurada' },
        { status: 500 }
      );
    }
    
    // Llamar a la API de Claude con instrucciones específicas para el formato de fecha
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza este ticket de compra y extrae la siguiente información en formato JSON:\n\n" +
                      "1. fecha: la fecha del ticket en formato YYYY-MM-DD (muy importante este formato exacto). Si no puedes determinar la fecha con certeza, usa la fecha actual.\n" +
                      "2. total (XX.XX€): el importe total del ticket\n" +
                      "3. items: un array de artículos con:\n" +
                      "   - name: nombre del artículo\n" +
                      "   - price: precio unitario con formato 'XX.XX€'\n" +
                      "   - quantity: cantidad (busca números al inicio de cada línea)\n\n" +
                      "Ten en cuenta que en los tickets españoles, normalmente cada línea tiene este formato:\n" +
                      "CANTIDAD DESCRIPCIÓN PRECIO_UNITARIO PRECIO_TOTAL\n\n" +
                      "Por ejemplo: '2 CAFÉ 1.20 2.40' significa 2 unidades de café a 1.20€ cada uno.\n\n" +
                      "Devuelve solo el JSON con este formato exacto: {\"fecha\":\"YYYY-MM-DD\",\"total\":\"XX.XX€\",\"items\":[{\"name\":\"Nombre\",\"price\":\"XX.XX€\",\"quantity\":X}, ...]}\n\n" +
                      "IMPORTANTE: La fecha DEBE tener el formato YYYY-MM-DD, por ejemplo: 2025-02-27"
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Error de la API de Claude: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Extraer el texto de la respuesta
    if (!result.content || !result.content[0] || !result.content[0].text) {
      return NextResponse.json(
        { error: 'Formato de respuesta inesperado de Claude' },
        { status: 500 }
      );
    }
    
    const content = result.content[0].text;
    
    // Intentar analizar el JSON de la respuesta
    try {
      // Buscar un objeto JSON en la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const ticketData = JSON.parse(jsonStr);
        
        // Verificar y corregir el formato de fecha si es necesario
        if (ticketData.fecha) {
          // Si la fecha no tiene el formato correcto, intentar convertirla
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ticketData.fecha)) {
            try {
              // Intentar diferentes formatos de fecha
              const dateObj = new Date(ticketData.fecha);
              if (!isNaN(dateObj.getTime())) {
                // Formato YYYY-MM-DD
                ticketData.fecha = dateObj.toISOString().split('T')[0];
              } else {
                // Si no se puede parsear, usar la fecha actual
                const today = new Date();
                ticketData.fecha = today.toISOString().split('T')[0];
              }
            } catch (dateError) {
              // Si hay algún error, establecer la fecha actual
              const today = new Date();
              ticketData.fecha = today.toISOString().split('T')[0];
            }
          }
        } else {
          // Si no hay fecha, establecer la fecha actual
          const today = new Date();
          ticketData.fecha = today.toISOString().split('T')[0];
        }
        
        return NextResponse.json(ticketData);
      } else {
        // Si no se encuentra un objeto JSON, crear uno con valores predeterminados
        const today = new Date();
        return NextResponse.json({ 
          fecha: today.toISOString().split('T')[0],
          total: "0.00€",
          items: [],
          error: 'No se pudo extraer datos estructurados', 
          raw: content 
        });
      }
    } catch (parseError) {
      // Si hay un error al analizar, crear un objeto con valores predeterminados
      const today = new Date();
      return NextResponse.json({ 
        fecha: today.toISOString().split('T')[0],
        total: "0.00€",
        items: [],
        error: 'Error al analizar la respuesta', 
        raw: content 
      });
    }
  } catch (error) {
    console.error('Error al procesar el ticket:', error);
    const today = new Date();
    return NextResponse.json(
      { 
        fecha: today.toISOString().split('T')[0],
        total: "0.00€",
        items: [],
        error: 'Error interno del servidor', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}