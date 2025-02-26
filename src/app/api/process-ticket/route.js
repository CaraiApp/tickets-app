// src/app/api/process-ticket/route.js
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
    
    // Llamar a la API de Claude
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
                text: "Analiza este ticket y extrae la siguiente información en formato JSON: fecha, total, y una lista de artículos con sus precios. El formato debe ser exactamente: {\"fecha\": \"DD/MM/YYYY\", \"total\": \"XX.XX€\", \"items\": [{\"name\": \"Nombre del artículo\", \"price\": \"XX.XX€\"}, ...]}. Solo quiero el JSON, sin explicaciones adicionales."
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
        return NextResponse.json(ticketData);
      } else {
        // Si no se encuentra un objeto JSON, devolver el texto completo
        return NextResponse.json({ 
          error: 'No se pudo extraer datos estructurados', 
          raw: content 
        });
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Error al analizar la respuesta', 
        raw: content 
      });
    }
  } catch (error) {
    console.error('Error al procesar el ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}