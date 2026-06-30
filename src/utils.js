export const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
};

export const calcularPercentual = (valorAtual, valorTotal) => {
    if (valorTotal === 0) return 0;
    return Math.min(Math.round((valorAtual / valorTotal) * 100), 100);
};
