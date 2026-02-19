import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, getBuildingTypeLabel, getAQILevel } from './utils';

// Color palette
const COLORS = {
  primary: [34, 139, 34], // Forest green
  secondary: [0, 137, 209], // Blue
  accent: [255, 152, 0], // Orange
  dark: [33, 37, 41],
  muted: [108, 117, 125],
  light: [248, 249, 250],
  white: [255, 255, 255],
};

export async function generateBuildingReportPDF(building, recommendations, auditLogs, providers) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  // Helper functions
  const addHeader = (pageNum, totalPages) => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.text('Sus10 AI - Green Potential Report', margin, 10);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, 10);
  };
  
  const addFooter = () => {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, margin, pageHeight - 10);
    doc.text('www.sus10.ai', pageWidth - margin - 25, pageHeight - 10);
  };

  // ==================== PAGE 1: Cover & Overview ====================
  addHeader(1, 5);
  
  // Title section
  let y = 35;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Green Potential Report', margin, y);
  
  y += 15;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.text(building.address, margin, y);
  
  y += 10;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${building.city}, ${building.pincode} | ${getBuildingTypeLabel(building.building_type)}`, margin, y);
  
  // Green potential score box
  y += 20;
  const scoreBoxWidth = 60;
  const scoreBoxHeight = 40;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, scoreBoxWidth, scoreBoxHeight, 5, 5, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  const score = recommendations[0]?.suitability_score || 75;
  doc.text(`${score}%`, margin + 10, y + 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Green Potential', margin + 10, y + 35);
  
  // Key metrics
  const metricsStartX = margin + scoreBoxWidth + 20;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  
  const metrics = [
    { label: 'Building Footprint', value: `${(building.building_footprint_area || 0).toLocaleString()} sqm` },
    { label: 'Usable Terrace', value: `${(building.usable_terrace_area || 0).toLocaleString()} sqm` },
    { label: 'Current AQI', value: `${building.current_aqi || 'N/A'} (${building.aqi_trend || 'stable'})` },
    { label: 'Data Quality', value: `${building.data_quality_score || 0}%` },
  ];
  
  metrics.forEach((m, i) => {
    const mx = metricsStartX + (i % 2) * 55;
    const my = y + Math.floor(i / 2) * 18;
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, mx, my + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(m.label, mx, my + 14);
    doc.setTextColor(...COLORS.dark);
  });
  
  // Problem statement
  y += 60;
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('The Challenge', margin + 10, y + 12);
  
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const challengeText = `${building.city} faces significant air quality challenges with current AQI at ${building.current_aqi || 'elevated levels'}. Urban heat island effect and limited green cover contribute to elevated temperatures and poor air quality in commercial zones. This building has ${(building.usable_terrace_area || 0).toLocaleString()} sqm of potential green space.`;
  const splitChallenge = doc.splitTextToSize(challengeText, contentWidth - 20);
  doc.text(splitChallenge, margin + 10, y + 22);
  
  // Executive summary
  y += 55;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  
  y += 8;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryText = `This report analyzes the green potential of ${building.address}. Based on building characteristics, local climate data, and AQI trends, we have identified ${recommendations.length} solution(s) suitable for implementation. The overall suitability score is ${score}%, indicating ${score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'moderate'} potential for sustainable interventions.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, y);
  
  addFooter();

  // ==================== PAGE 2: Solutions ====================
  doc.addPage();
  addHeader(2, 5);
  
  y = 30;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended Solutions', margin, y);
  
  y += 15;
  
  recommendations.forEach((rec, index) => {
    if (y > pageHeight - 60) {
      doc.addPage();
      addHeader(2, 5);
      y = 30;
    }
    
    const solType = rec.solution_type || {};
    
    // Solution card
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, y, contentWidth, 55, 3, 3, 'F');
    
    // Solution number badge
    doc.setFillColor(...COLORS.primary);
    doc.circle(margin + 10, y + 12, 8, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, margin + 7, y + 15);
    
    // Solution name
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.text(solType.name || `Solution ${index + 1}`, margin + 25, y + 15);
    
    // Category badge
    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(margin + 25, y + 20, 30, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.text((solType.category || 'greening').toUpperCase(), margin + 28, y + 25);
    
    // Suitability score
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${rec.suitability_score}%`, pageWidth - margin - 25, y + 18);
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Suitability', pageWidth - margin - 25, y + 24);
    
    // Description
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    const desc = solType.description || rec.reasoning || 'Recommended based on building analysis.';
    const splitDesc = doc.splitTextToSize(desc, contentWidth - 60);
    doc.text(splitDesc.slice(0, 2), margin + 25, y + 35);
    
    // Cost estimate
    if (rec.cost_estimate) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Est. Cost: ${formatCurrency(rec.cost_estimate)}`, margin + 25, y + 50);
    }
    
    y += 65;
  });
  
  addFooter();

  // ==================== PAGE 3: Impact Projections ====================
  doc.addPage();
  addHeader(3, 5);
  
  y = 30;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Impact Projections', margin, y);
  
  y += 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Projected environmental benefits from implementing recommended solutions', margin, y);
  
  y += 15;
  
  // Impact table
  const impactData = [];
  recommendations.forEach((rec) => {
    const solName = rec.solution_type?.name || 'Solution';
    if (rec.impact_projections) {
      Object.entries(rec.impact_projections).forEach(([key, value]) => {
        impactData.push([
          solName,
          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          typeof value === 'number' ? value.toLocaleString() : value,
          rec.solution_type?.metrics?.find(m => m.name.toLowerCase().includes(key.split('_')[0]))?.confidence 
            ? `${(rec.solution_type.metrics.find(m => m.name.toLowerCase().includes(key.split('_')[0])).confidence * 100).toFixed(0)}%`
            : '85%'
        ]);
      });
    }
  });
  
  if (impactData.length > 0) {
    doc.autoTable({
      startY: y,
      head: [['Solution', 'Impact Metric', 'Projected Value', 'Confidence']],
      body: impactData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    });
    
    y = doc.lastAutoTable.finalY + 15;
  }
  
  // Annual benefits summary
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estimated Annual Benefits', margin + 10, y + 12);
  
  const totalCO2 = recommendations.reduce((sum, r) => 
    sum + (r.impact_projections?.co2_sequestration_kg_year || 0), 0);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`CO2 Sequestration: ${totalCO2.toLocaleString()} kg/year`, margin + 10, y + 22);
  doc.text(`Equivalent to: ${Math.round(totalCO2 / 21)} trees planted`, margin + 10, y + 30);
  
  addFooter();

  // ==================== PAGE 4: Explainability ====================
  doc.addPage();
  addHeader(4, 5);
  
  y = 30;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Calculation Methodology', margin, y);
  
  y += 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Full transparency in how we calculated your building\'s green potential', margin, y);
  
  y += 15;
  
  auditLogs.forEach((audit, auditIndex) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      addHeader(4, 5);
      y = 30;
    }
    
    const recName = recommendations.find(r => r.recommendation_id === audit.recommendation_id)?.solution_type?.name || `Solution ${auditIndex + 1}`;
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(recName, margin, y);
    y += 8;
    
    if (audit.calculation_steps) {
      audit.calculation_steps.forEach((step, stepIndex) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          addHeader(4, 5);
          y = 30;
        }
        
        doc.setFillColor(...COLORS.light);
        doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
        
        // Step number
        doc.setFillColor(...COLORS.secondary);
        doc.circle(margin + 8, y + 11, 5, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(8);
        doc.text(`${step.step}`, margin + 6, y + 13);
        
        // Step content
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(step.description, margin + 18, y + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        if (step.formula) {
          doc.text(`Formula: ${step.formula}`, margin + 18, y + 14);
        }
        if (step.result) {
          doc.setTextColor(...COLORS.primary);
          doc.text(`Result: ${step.result}`, margin + 18, y + 20);
        }
        
        y += 26;
      });
    }
    
    y += 10;
  });
  
  addFooter();

  // ==================== PAGE 5: Providers ====================
  doc.addPage();
  addHeader(5, 5);
  
  y = 30;
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended Providers', margin, y);
  
  y += 8;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Verified solution providers serving ${building.city}`, margin, y);
  
  y += 15;
  
  if (providers && providers.length > 0) {
    providers.forEach((provider, index) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        addHeader(5, 5);
        y = 30;
      }
      
      doc.setFillColor(...COLORS.light);
      doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
      
      // Provider name
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(provider.company_name, margin + 10, y + 12);
      
      // Type badge
      doc.setFillColor(...COLORS.secondary);
      doc.roundedRect(margin + 10, y + 16, 35, 7, 2, 2, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(7);
      doc.text((provider.company_type || 'provider').toUpperCase(), margin + 12, y + 21);
      
      // Rating
      if (provider.customer_rating) {
        doc.setTextColor(...COLORS.accent);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`★ ${provider.customer_rating}`, pageWidth - margin - 25, y + 15);
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${provider.review_count} reviews`, pageWidth - margin - 25, y + 22);
      }
      
      // Description
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      const provDesc = provider.description || 'Verified provider';
      const splitProvDesc = doc.splitTextToSize(provDesc, contentWidth - 60);
      doc.text(splitProvDesc.slice(0, 2), margin + 10, y + 32);
      
      y += 48;
    });
  } else {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(11);
    doc.text('No providers currently available for this area.', margin, y);
    doc.text('Visit sus10.ai/providers to find solution providers.', margin, y + 8);
  }
  
  // Call to action
  y = pageHeight - 60;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ready to Transform Your Building?', margin + 10, y + 14);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Visit sus10.ai to connect with providers and start your sustainability journey.', margin + 10, y + 24);
  
  addFooter();

  // Save the PDF
  const fileName = `Sus10_Report_${building.building_id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
}
