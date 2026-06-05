/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Audit, Defect, AuditDefect } from '../types';

export function generateQualityPDF(audits: Audit[], defects: Defect[], auditDefects: AuditDefect[]) {
  // 1. Calculate and compile statistical indicators (matching Dashboard and ReportsManager logic)
  let totalInspected = 0;
  let totalApproved = 0;
  let totalFailed = 0;

  audits.forEach(a => {
    totalInspected += a.quantidade_auditada;
    totalApproved += a.quantidade_aprovada;
    totalFailed += a.quantidade_rejeitada;
  });

  const ppm = totalInspected > 0 ? Math.round((totalFailed / totalInspected) * 1000000) : 0;
  const fpy = totalInspected > 0 ? (totalApproved / totalInspected) * 100 : 100;
  const approvalRate = totalInspected > 0 ? (totalApproved / totalInspected) * 100 : 100;
  const rejectionRate = totalInspected > 0 ? (totalFailed / totalInspected) * 100 : 0;

  // Calculate Pareto Pareto 80/20 list
  const totalDefectsMap: { [defectId: string]: number } = {};
  const productDefectsMap: { [product: string]: number } = {
    'Ventilador': 0, 'Liquidificador': 0, 'Panela de Pressão': 0
  };
  const lineDefectsMap: { [line: string]: number } = {};

  auditDefects.forEach(ad => {
    const audit = audits.find(a => a.id === ad.audit_id);
    if (!audit) return;
    const count = ad.quantidade;
    
    totalDefectsMap[ad.defect_id] = (totalDefectsMap[ad.defect_id] || 0) + count;
    productDefectsMap[audit.produto_tipo] = (productDefectsMap[audit.produto_tipo] || 0) + count;
    lineDefectsMap[audit.linha] = (lineDefectsMap[audit.linha] || 0) + count;
  });

  const defectsRank = Object.keys(totalDefectsMap).map(id => {
    const def = defects.find(d => d.id === id);
    return {
      codigo: def?.codigo || 'FALHA',
      nome: def?.nome || 'Deito não classificado',
      categoria: def?.categoria || 'Geral',
      severidade: def?.severidade || 'Menor',
      quantidade: totalDefectsMap[id]
    };
  }).sort((a, b) => b.quantidade - a.quantidade);

  const totalDefectsSum = defectsRank.reduce((sum, d) => sum + d.quantidade, 0);
  let accumulatedSum = 0;
  const paretoGroup = defectsRank.map(item => {
    accumulatedSum += item.quantidade;
    const percentage = totalDefectsSum > 0 ? (accumulatedSum / totalDefectsSum) * 100 : 0;
    return {
      ...item,
      acumuladoPct: percentage,
      isCritical80: percentage <= 80
    };
  });

  const worstLine = Object.keys(lineDefectsMap)
    .map(k => ({ name: k, count: lineDefectsMap[k] }))
    .sort((a, b) => b.count - a.count)[0] || null;

  // 2. Initialize jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageHeight = 297;
  const marginX = 15;
  let currentY = 15;

  // Helper functions for layouts
  const drawPageFooter = (pagenum: number, totalpages: number) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.line(marginX, pageHeight - 15, 210 - marginX, pageHeight - 15);
    
    doc.text('QualiControl™ - Sistema de Inteligência de Auditoria Industrial', marginX, pageHeight - 10);
    doc.text(`Laudo gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')} • Página ${pagenum} de ${totalpages}`, 210 - marginX, pageHeight - 10, { align: 'right' });
  };

  const checkPageBreak = (neededSpace: number, currentPageRef: { val: number }) => {
    if (currentY + neededSpace > pageHeight - 20) {
      doc.addPage();
      currentPageRef.val += 1;
      currentY = 15;
      drawHeaderBlock();
    }
  };

  const drawHeaderBlock = () => {
    // Top banner
    doc.setFillColor(15, 23, 42); // slate-900 (deep background)
    doc.rect(marginX, currentY, 180, 28, 'F');

    // Accent line (Sky Blue)
    doc.setFillColor(14, 165, 233); // sky-500
    doc.rect(marginX, currentY + 28, 180, 1.5, 'F');

    // Title & Brand info inside slate bar
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('QualiControl™', marginX + 8, currentY + 11);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(56, 189, 248); // sky-400 accent
    doc.text('TECNOLOGIA INDUSTRIAL CONFORME CERTIFICAÇÃO ISO 9001:2015', marginX + 8, currentY + 15);

    doc.setTextColor(248, 250, 252); // slate-50
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('LAUDO CONSOLIDADO E INDICADORES DE QUALIDADE', marginX + 8, currentY + 23);

    // Right-aligned report details
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Identificador: #${Math.floor(100000 + Math.random() * 900000)}`, 210 - marginX - 8, currentY + 11, { align: 'right' });
    doc.text(`Lotes Totais: ${audits.length}`, 210 - marginX - 8, currentY + 16, { align: 'right' });
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Status Geral: ${fpy >= 95.0 ? 'APROVADO' : 'ALERTA'}`, 210 - marginX - 8, currentY + 23, { align: 'right' });

    currentY += 36;
  };

  const pageObj = { val: 1 };

  // Page 1 Setup
  drawHeaderBlock();

  // Section: KPI Dashboard Panel (Beautiful Grid Boxes)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('I. INDICADORES CONSOLIDADOS DE CAPABILIDADE DE PROCESSO', marginX, currentY);
  currentY += 4;

  // Let's draw 4 aesthetic KPI cards (2x2 grid or row layout)
  const statsCols = [
    { label: 'PEÇAS AUDITADAS', value: totalInspected.toLocaleString() + ' Unidades', desc: 'Amostragem acumulada' },
    { label: 'FPY (FIRST PASS YIELD)', value: fpy.toFixed(2) + '%', desc: 'Meta de Linha: 95.00%', color: fpy >= 95 ? [16, 185, 129] : [245, 158, 11] },
    { label: 'DEFEITOS DETECTADOS', value: totalDefectsSum.toLocaleString() + ' pc(s)', desc: `${totalFailed} unidade(s) descartadas` },
    { label: 'TAXA DE REJEIÇÃO', value: rejectionRate.toFixed(2) + '%', desc: `PPM Total: ${ppm.toLocaleString()}` }
  ];

  // Draw 2 rows of 2 columns
  const cardW = 86;
  const cardH = 18;
  const gap = 8;

  // Row 1
  statsCols.forEach((col, idx) => {
    const isOdd = idx % 2 === 1;
    const x = marginX + (isOdd ? cardW + gap : 0);
    const rowY = currentY + (idx >= 2 ? cardH + gap - 3 : 0);

    // Card background box inside PDF
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, rowY, cardW, cardH, 2, 2, 'FD');

    // Card boundary visual accent line
    doc.setFillColor(col.color ? col.color[0] : 100, col.color ? col.color[1] : 116, col.color ? col.color[2] : 139);
    doc.rect(x, rowY, 2, cardH, 'F');

    // Labels & Values
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(col.label, x + 5, rowY + 5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    if (col.color) {
      doc.setTextColor(col.color[0], col.color[1], col.color[2]);
    }
    doc.text(col.value, x + 5, rowY + 11);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(col.desc, x + 5, rowY + 15);
  });

  currentY += cardH * 2 + gap + 3;

  // Section: Pareto Analysis Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('II. DIAGRAMA DE PARETO (TOP DEFEITOS ACUMULADOS EM LINHA)', marginX, currentY);
  currentY += 4;

  // Pareto summary list heading
  doc.setFillColor(30, 41, 59); // slate-800 background
  doc.rect(marginX, currentY, 180, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Classificação', marginX + 3, currentY + 4.5);
  doc.text('Código', marginX + 25, currentY + 4.5);
  doc.text('Descrição da Não-Conformidade', marginX + 50, currentY + 4.5);
  doc.text('Ocorrências', marginX + 115, currentY + 4.5);
  doc.text('Acumulado %', marginX + 140, currentY + 4.5);
  doc.text('Ação Corretiva 80/20', marginX + 162, currentY + 4.5);

  currentY += 6.5;

  if (paretoGroup.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma falha ou desvio registrado no histórico sob esta amostragem.', marginX + 5, currentY + 6);
    currentY += 10;
  } else {
    paretoGroup.slice(0, 6).forEach((item, index) => {
      // Row alternate background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, 180, 6, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, currentY + 6, marginX + 180, currentY + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      doc.text(`#0${index + 1} - ${index + 1 <= 2 ? 'Crítico (A)' : 'Trivial (B)'}`, marginX + 3, currentY + 4.2);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(239, 68, 68); // Red code
      doc.text(item.codigo, marginX + 25, currentY + 4.2);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(item.nome.substring(0, 36), marginX + 50, currentY + 4.2);

      doc.setFont('Helvetica', 'bold');
      doc.text(item.quantidade + ' pcs', marginX + 115, currentY + 4.2);

      doc.setFont('Helvetica', 'normal');
      doc.text(`${item.acumuladoPct.toFixed(1)}%`, marginX + 140, currentY + 4.2);

      if (item.isCritical80) {
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('🔴 VITAL', marginX + 162, currentY + 4.2);
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Secundária', marginX + 162, currentY + 4.2);
      }

      currentY += 6;
    });
  }

  currentY += 6;

  // Let's add process description paragraph before table pagebreak
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Nota de Inteligência de Engenharia de Qualidade:', marginX, currentY);
  currentY += 3.5;
  
  const textNote = 'Os desvios classificados como "VITAL (🔴)" representam os focos Drásticos da amostragem de qualidade (Curva ABC). Um esforço de correção de processos direcionado sobre esses desvios mitigará cerca de 80% dos custos correntes de refugo da linha industrial. Os desvios secundários devem ser tratados no fluxo contínuo de Kaizen.';
  const wrappedTextNote = doc.splitTextToSize(textNote, 180);
  doc.text(wrappedTextNote, marginX, currentY);
  currentY += wrappedTextNote.length * 3.5 + 4;

  // Check and transition to Page 2 for complete audit list
  checkPageBreak(80, pageObj);

  // Section: Complete Audit History Log List Table
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('III. HISTÓRICO CONSOLIDADO E LAUDOS REGISTRADOS DE INSPEÇÃO', marginX, currentY);
  currentY += 4;

  // Draw Audit table headers
  doc.setFillColor(15, 23, 42); // deep slate
  doc.rect(marginX, currentY, 180, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Lote', marginX + 3, currentY + 4.5);
  doc.text('Data/Hora', marginX + 22, currentY + 4.5);
  doc.text('Modelo Técnico', marginX + 48, currentY + 4.5);
  doc.text('Linha-Turno', marginX + 102, currentY + 4.5);
  doc.text('Amostra(N)', marginX + 128, currentY + 4.5);
  doc.text('Aprov/Rej', marginX + 146, currentY + 4.5);
  doc.text('Rendimento FPY', marginX + 166, currentY + 4.5);

  currentY += 6.5;

  // Page tracking for table rows
  audits.forEach((a, index) => {
    checkPageBreak(8, pageObj);

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, 180, 6, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, currentY + 6, marginX + 180, currentY + 6);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(a.lote, marginX + 3, currentY + 4.2);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${a.data.split('-').reverse().join('/')} ${a.hora}`, marginX + 22, currentY + 4.2);

    doc.setFont('Helvetica', 'semibold');
    doc.setTextColor(51, 65, 85);
    doc.text(a.modelo.substring(0, 28), marginX + 48, currentY + 4.2);

    doc.setFont('Helvetica', 'normal');
    doc.text(`${a.linha.replace('Linha ', 'L.')} / ${a.turno.replace('Turno ', 'T')}`, marginX + 102, currentY + 4.2);

    doc.setFont('Helvetica', 'mono');
    doc.text(`N=${a.quantidade_auditada}`, marginX + 128, currentY + 4.2);
    doc.text(`${a.quantidade_aprovada}/${a.quantidade_rejeitada}`, marginX + 146, currentY + 4.2);

    const fpySingle = a.quantidade_auditada > 0 ? (a.quantidade_aprovada / a.quantidade_auditada) * 100 : 100;
    
    // Status text format color
    if (fpySingle >= 95.0) {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // green
      doc.text(`${fpySingle.toFixed(1)}% (Ok)`, marginX + 166, currentY + 4.2);
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // red
      doc.text(`${fpySingle.toFixed(1)}% (Falha)`, marginX + 166, currentY + 4.2);
    }

    currentY += 6;
  });

  currentY += 6;

  // Let's add the Technical Conclusion text + audit checklist
  checkPageBreak(50, pageObj);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.1);
  doc.setTextColor(15, 23, 42);
  doc.text('IV. PARECER GERAL DE HOMOLOGAÇÃO & ASSINATURA AUTOMÁTICA', marginX, currentY);
  currentY += 4.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, 180, 35, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Laudo de Avaliação de Conexão:', marginX + 5, currentY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);

  const statusVerdictText = fpy >= 95.0
    ? `Certificamos que as linhas industriais vigentes encontram-se operativas em conformidade regulamentar de Capabilidade de Linha, atingindo uma performance de First Pass Yield consolidada de ${fpy.toFixed(2)}%, acima do limite aceitável corporativo internacional de 95.00%. Todos os lotes estão autorizados para despacho imediato.`
    : `ATENÇÃO: A performance de rendimento geral FPY atual está calculada em ${fpy.toFixed(2)}%, indicador que se encontra ABAIXO da meta mínima de conformidade operacional de 95.00%. Ativar os planos internos de auditoria emergencial de componentes sobre a ${worstLine ? worstLine.name : 'Linha Crítica'} e suspender novas distribuições até resolução corretiva.`;

  const flowVerText = doc.splitTextToSize(statusVerdictText, 170);
  doc.text(flowVerText, marginX + 5, currentY + 11);

  // Digital Sign details at bottom inside background card
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Validação Digital Qualicontrol:', marginX + 5, currentY + 29);
  
  doc.setFont('Helvetica', 'mono');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`HASH SHA-256 DIGITAL: FPY-CERT-${fpy.toFixed(2)}-AUTO-${Math.floor(1000 + Math.random() * 9000)}-Q9001`, marginX + 5, currentY + 32);

  currentY += 42;

  // Draw Professional physical Signoff dashes
  checkPageBreak(30, pageObj);
  
  doc.setDrawColor(186, 195, 208);
  doc.line(marginX + 15, currentY + 15, marginX + 70, currentY + 15);
  doc.line(marginX + 110, currentY + 15, marginX + 165, currentY + 15);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Assinatura do Inspetor / Auditor', marginX + 22, currentY + 19);
  doc.text('Assinatura - Gerência Industrial ISO 9001', marginX + 112, currentY + 19);

  // 3. Draw headers and footers retroactively on all pages
  const totalPagesCount = pageObj.val;
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPagesCount);
  }

  // 4. Trigger download
  doc.save(`QualiControl_LaudoTecnico_FPY_${fpy.toFixed(1)}pct.pdf`);
}
