#!/bin/bash
# Script para configurar el servidor de producción
# Ejecutar como root o con sudo

set -e

echo "🔧 Configurando servidor para Huao WhatsApp Bot..."

# Actualizar el sistema
echo "📦 Actualizando sistema..."
apt-get update
apt-get upgrade -y

# Instalar dependencias básicas
echo "📦 Instalando dependencias básicas..."
apt-get install -y \
    curl \
    wget \
    git \
    nano \
    htop \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# Instalar Docker
echo "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    # Agregar repositorio oficial de Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Habilitar Docker al inicio
    systemctl enable docker
    systemctl start docker
    
    echo "✅ Docker instalado correctamente"
else
    echo "✅ Docker ya está instalado"
fi

# Instalar Docker Compose (versión standalone por compatibilidad)
echo "🐳 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado correctamente"
else
    echo "✅ Docker Compose ya está instalado"
fi

# Crear usuario para la aplicación (opcional pero recomendado)
echo "👤 Configurando usuario de aplicación..."
if ! id -u huao &>/dev/null; then
    useradd -m -s /bin/bash huao
    usermod -aG docker huao
    echo "✅ Usuario 'huao' creado y agregado al grupo docker"
else
    echo "✅ Usuario 'huao' ya existe"
fi

# Configurar firewall básico (UFW)
echo "🔥 Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp      # SSH
    ufw allow 80/tcp      # HTTP
    ufw allow 443/tcp     # HTTPS
    ufw --force enable
    echo "✅ Firewall configurado"
else
    apt-get install -y ufw
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "✅ Firewall instalado y configurado"
fi

# Crear directorio para la aplicación
echo "📁 Creando directorios..."
mkdir -p /opt/huao
chown -R huao:huao /opt/huao

echo ""
echo "✅ ¡Servidor configurado exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Cambiar al usuario huao: su - huao"
echo "2. Ir al directorio: cd /opt/huao"
echo "3. Clonar el repositorio: git clone https://github.com/bryansgue/huao.git ."
echo "4. Configurar variables de entorno: cp .env.example .env && nano .env"
echo "5. Iniciar la aplicación: docker-compose up -d"
echo ""
