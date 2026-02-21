import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-wa-dark flex flex-col items-center justify-center p-8 text-white z-50 relative">
                    <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-2xl w-full">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Algo salió mal (Render Error)</h1>
                        <p className="mb-4 text-gray-300">
                            La aplicación ha encontrado un error crítico al renderizar.
                        </p>

                        <div className="bg-black/50 p-4 rounded-lg overflow-auto max-h-60 mb-4 border border-white/10">
                            <code className="text-xs font-mono text-red-300 block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-[10px] text-gray-500 font-mono">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
