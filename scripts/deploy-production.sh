#!/bin/bash
# Script de despliegue para producción
# Ejecutar en el servidor después de hacer git pull

set -e

echo "🚀 Iniciando despliegue de Huao Bot..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml no encontrado${NC}"
    echo "Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: Archivo .env no encontrado${NC}"
    echo "Copia .env.example a .env y configura las variables"
    exit 1
fi

echo -e "${YELLOW}📦 Deteniendo contenedores actuales...${NC}"
docker-compose down

echo -e "${YELLOW}🏗️  Construyendo nuevas imágenes...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}🧹 Limpiando imágenes antiguas...${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Iniciando contenedores...${NC}"
docker-compose up -d

echo -e "${YELLOW}⏳ Esperando que los contenedores inicien...${NC}"
sleep 10

# Verificar que los contenedores están corriendo
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Contenedores iniciados correctamente${NC}"
else
    echo -e "${RED}❌ Error: Los contenedores no iniciaron correctamente${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# Ejecutar migraciones de base de datos si es necesario
echo -e "${YELLOW}🗄️  Ejecutando migraciones de base de datos...${NC}"
docker-compose exec -T app npx prisma migrate deploy || {
    echo -e "${YELLOW}⚠️  Las migraciones fallaron o ya están aplicadas${NC}"
}

echo ""
echo -e "${GREEN}✅ ¡Despliegue completado exitosamente!${NC}"
echo ""
echo "📊 Estado de los contenedores:"
docker-compose ps
echo ""
echo "📝 Ver logs en tiempo real:"
echo "   docker-compose logs -f"
echo ""
echo "🔄 Reiniciar un servicio:"
echo "   docker-compose restart app"
echo ""
