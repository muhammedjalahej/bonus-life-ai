import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


async def _analyze_with_personal_context(
    symptoms: List[str],
    age: Optional[int],
    weight: Optional[float],
    height: Optional[float],
    existing_conditions: List[str],
    medications: List[str],
    language: str
) -> Dict[str, Any]:
    """Analyze symptoms with personal context for true personalization"""
    
    # Calculate personalized risk factors
    risk_factors = _calculate_personal_risk_factors(age, weight, height, existing_conditions, medications)
    
    # Analyze symptom patterns
    symptom_analysis = _analyze_symptom_patterns(symptoms, age, existing_conditions)
    
    # Generate personalized assessment
    assessment = _generate_personalized_assessment(symptoms, risk_factors, symptom_analysis, language)
    
    # Calculate urgency level based on personal factors
    urgency_level = _calculate_personalized_urgency(symptoms, risk_factors, age)
    
    # Generate personalized recommendations
    recommendations = _generate_personalized_recommendations(
        symptoms, urgency_level, risk_factors, age, existing_conditions, language
    )
    
    # Generate personalized next steps
    next_steps = _generate_personalized_next_steps(urgency_level, risk_factors, age, language)
    
    return {
        "assessment": assessment["summary"],
        "personalized_analysis": assessment["detailed_analysis"],
        "recommendations": recommendations,
        "urgency_level": urgency_level,
        "risk_factors": risk_factors,
        "next_steps": next_steps
    }


def _calculate_personal_risk_factors(
    age: Optional[int],
    weight: Optional[float],
    height: Optional[float],
    existing_conditions: List[str],
    medications: List[str]
) -> List[str]:
    """Calculate personalized risk factors"""
    risk_factors = []
    
    # Age-based risks
    if age:
        if age < 18:
            risk_factors.append("Pediatric patient - different symptom presentation")
        elif age > 65:
            risk_factors.append("Senior patient - higher complication risk")
        elif age > 50:
            risk_factors.append("Middle-aged - increased diabetes risk")
    
    # BMI-based risks
    if weight and height:
        bmi = weight / ((height / 100) ** 2)
        if bmi > 30:
            risk_factors.append(f"High BMI ({bmi:.1f}) - increased health risks")
        elif bmi > 25:
            risk_factors.append(f"Elevated BMI ({bmi:.1f})")
    
    # Condition-based risks
    condition_risks = {
        "heart": "Cardiovascular condition - monitor carefully",
        "kidney": "Kidney issues - fluid balance critical", 
        "hypertension": "High blood pressure - cardiovascular risk",
        "cholesterol": "Cholesterol issues - metabolic concern",
        "diabetes": "Existing diabetes - acute complication risk"
    }
    
    for condition in existing_conditions:
        condition_lower = condition.lower()
        for key, risk in condition_risks.items():
            if key in condition_lower:
                risk_factors.append(risk)
                break
    
    # Medication-based risks
    if any("insulin" in med.lower() for med in medications):
        risk_factors.append("Insulin therapy - hypoglycemia risk")
    if any("metformin" in med.lower() for med in medications):
        risk_factors.append("Metformin use - gastrointestinal considerations")
    if any("blood thinner" in med.lower() or "anticoagulant" in med.lower() for med in medications):
        risk_factors.append("Blood thinner medication - bleeding risk")
    
    return risk_factors if risk_factors else ["Standard risk profile"]


def _analyze_symptom_patterns(symptoms: List[str], age: Optional[int], conditions: List[str]) -> Dict[str, Any]:
    """Analyze symptom patterns for personalization"""
    
    # Critical symptom groups
    critical_groups = {
        "diabetic_emergency": ["extreme thirst", "frequent urination", "fruity breath", "confusion"],
        "cardiovascular": ["chest pain", "difficulty breathing", "rapid heartbeat", "dizziness"],
        "neurological": ["confusion", "blurred vision", "dizziness", "difficulty concentrating"]
    }
    
    # Find matching symptom groups
    matched_groups = []
    for group_name, group_symptoms in critical_groups.items():
        matches = [symptom for symptom in symptoms if any(gs in symptom.lower() for gs in group_symptoms)]
        if len(matches) >= 2:  # At least 2 symptoms from a group
            matched_groups.append(group_name)
    
    # Categorize symptoms by severity
    emergency_symptoms = ["confusion", "difficulty breathing", "chest pain", "unconscious", "seizure", "nausea", "vomiting"]
    severe_symptoms = ["extreme thirst", "blurred vision", "weight loss", "frequent urination", "fruity breath"]
    moderate_symptoms = ["fatigue", "increased hunger", "slow healing", "tingling"]
    
    emergency_count = sum(1 for symptom in symptoms if any(es in symptom.lower() for es in emergency_symptoms))
    severe_count = sum(1 for symptom in symptoms if any(ss in symptom.lower() for ss in severe_symptoms))
    moderate_count = sum(1 for symptom in symptoms if any(ms in symptom.lower() for ms in moderate_symptoms))
    
    # Calculate symptom severity score
    severity_score = (emergency_count * 3) + (severe_count * 2) + (moderate_count * 1)
    
    # Age-specific considerations
    age_notes = []
    if age:
        if age < 30:
            age_notes.append("Young adult - typically higher resilience")
        elif age > 60:
            age_notes.append("Senior - may have atypical symptom presentation")
    
    return {
        "matched_groups": matched_groups,
        "symptom_count": len(symptoms),
        "age_notes": age_notes,
        "has_critical_combination": len(matched_groups) > 0,
        "emergency_count": emergency_count,
        "severe_count": severe_count,
        "moderate_count": moderate_count,
        "severity_score": severity_score
    }


def _generate_personalized_assessment(
    symptoms: List[str], 
    risk_factors: List[str],
    symptom_analysis: Dict[str, Any],
    language: str
) -> Dict[str, str]:
    """Generate truly personalized assessment"""
    
    symptom_count = len(symptoms)
    has_critical_combinations = symptom_analysis["has_critical_combination"]
    risk_level = "HIGH" if len(risk_factors) > 2 else "MODERATE" if risk_factors else "STANDARD"
    
    # Base assessment
    if has_critical_combinations:
        summary = f"[ALERT] CRITICAL: Multiple emergency symptom patterns detected"
        detailed = f"Based on your {symptom_count} symptoms including critical combinations, this appears to be a medical emergency. Your {risk_level} risk profile ({len(risk_factors)} factors) increases urgency."
    
    elif symptom_count >= 5:
        summary = f"[OFF] HIGH: Multiple concerning symptoms with {risk_level} risk profile"
        detailed = f"You're experiencing {symptom_count} symptoms which, combined with your {risk_level} risk profile ({len(risk_factors)} factors), requires urgent attention."
    
    elif symptom_count >= 3:
        summary = f" MODERATE: Multiple symptoms with {risk_level} risk factors"
        detailed = f"Your {symptom_count} symptoms along with {len(risk_factors)} risk factors need careful monitoring and professional evaluation."
    
    else:
        summary = f"[ON] MILD: Limited symptoms with {risk_level} monitoring needed"
        detailed = f"While you have only {symptom_count} symptom(s), your risk factors suggest careful monitoring is advised."
    
    # Add personalized notes
    if risk_factors:
        detailed += f" Key considerations: {', '.join(risk_factors[:3])}."
    
    if symptom_analysis["age_notes"]:
        detailed += f" Age note: {symptom_analysis['age_notes'][0]}"
    
    return {
        "summary": summary,
        "detailed_analysis": detailed
    }


def _calculate_personalized_urgency(symptoms: List[str], risk_factors: List[str], age: Optional[int]) -> str:
    """Calculate personalized urgency level"""
    
    # Critical symptoms
    critical_symptoms = ["difficulty breathing", "chest pain", "confusion", "unconscious", "seizure"]
    has_critical = any(any(cs in symptom.lower() for cs in critical_symptoms) for symptom in symptoms)
    
    if has_critical:
        return "critical"
    
    # High urgency based on combinations
    high_symptoms = ["vomiting", "fever", "dizziness", "extreme thirst", "frequent urination", "rapid heartbeat"]
    high_count = sum(1 for symptom in symptoms if any(hs in symptom.lower() for hs in high_symptoms))
    
    if high_count >= 2 and len(risk_factors) >= 2:
        return "high"
    elif high_count >= 2 or len(risk_factors) >= 3:
        return "high"
    
    # Age considerations
    if age and age > 65 and len(symptoms) >= 2:
        return "high"
    
    # Medium urgency
    if len(symptoms) >= 3 or len(risk_factors) >= 1:
        return "medium"
    
    return "low"


def _generate_personalized_recommendations(
    symptoms: List[str],
    urgency: str,
    risk_factors: List[str],
    age: Optional[int],
    conditions: List[str],
    language: str
) -> List[str]:
    """Generate personalized recommendations"""
    
    recommendations = []
    
    # Urgency-based recommendations
    if urgency == "critical":
        recommendations.extend([
            "[ALERT] CALL EMERGENCY SERVICES IMMEDIATELY (911/112)",
            "Do not attempt to drive yourself",
            "Have someone stay with you continuously",
            "Prepare your medical information and medications list"
        ])
    elif urgency == "high":
        recommendations.extend([
            "Contact healthcare provider within 1 hour",
            "Check blood sugar levels immediately if possible",
            "Have someone available to drive you if needed",
            "Gather recent medical records and test results"
        ])
    else:
        recommendations.extend([
            "Schedule doctor appointment within 24 hours",
            "Monitor symptoms every 2-4 hours",
            "Keep a symptom diary with timestamps",
            "Stay hydrated with water, avoid sugary drinks"
        ])
    
    # Symptom-specific recommendations
    if any("thirst" in symptom.lower() or "urination" in symptom.lower() for symptom in symptoms):
        recommendations.append("Monitor fluid intake and output carefully")
    
    if any("vision" in symptom.lower() for symptom in symptoms):
        recommendations.append("Avoid driving or operating machinery")
    
    if any("breathing" in symptom.lower() for symptom in symptoms):
        recommendations.append("Sit upright and try to stay calm")
    
    # Risk-factor specific recommendations
    if any("Senior" in factor for factor in risk_factors):
        recommendations.append("Extra caution advised due to age-related risks")
    
    if any("BMI" in factor for factor in risk_factors):
        recommendations.append("Weight management should be discussed with provider")
    
    if any("diabetes" in condition.lower() for condition in conditions):
        recommendations.append("Bring glucose monitor and recent readings to appointment")
    
    # Age-specific recommendations
    if age:
        if age < 18:
            recommendations.append("Pediatric care considerations apply")
        elif age > 65:
            recommendations.append("Senior-specific monitoring protocols recommended")
    
    return recommendations


def _generate_personalized_next_steps(
    urgency: str,
    risk_factors: List[str],
    age: Optional[int],
    language: str
) -> List[str]:
    """Generate personalized next steps"""
    
    next_steps = []
    
    if urgency in ["critical", "high"]:
        next_steps.extend([
            "Emergency contact: Keep phone charged and accessible",
            "Medical info: Prepare list of medications and allergies",
            "Support: Arrange for someone to accompany you",
            "Documents: Have insurance information ready"
        ])
    else:
        next_steps.extend([
            "Appointment: Schedule with primary care provider",
            "Preparation: Write down questions for your doctor",
            "Monitoring: Track symptom patterns until appointment",
            "Follow-up: Plan for telehealth option if available"
        ])
    
    # Personalized next steps based on risk factors
    if any("Senior" in factor for factor in risk_factors):
        next_steps.append("Consider geriatric specialist consultation")
    
    if any("Cardiovascular" in factor for factor in risk_factors):
        next_steps.append("Discuss cardiac evaluation with provider")
    
    return next_steps


async def _generate_personalized_fallback(request) -> Dict[str, Any]:
    """Personalized fallback assessment"""
    
    # Basic personalization even in fallback
    risk_factors = _calculate_personal_risk_factors(
        request.age, request.weight, request.height, 
        request.existing_conditions, request.current_medications
    )
    
    urgency = _calculate_personalized_urgency(request.symptoms, risk_factors, request.age)
    
    return {
        "assessment": "Personalized Assessment (Basic Mode)",
        "personalized_analysis": f"Based on your {len(request.symptoms)} symptoms and {len(risk_factors)} risk factors, careful monitoring is advised.",
        "recommendations": [
            "System temporarily using basic assessment",
            "Contact healthcare provider for detailed evaluation",
            "Monitor symptoms closely",
            "Note any changes in symptom patterns"
        ],
        "urgency_level": urgency,
        "risk_factors": risk_factors,
        "next_steps": [
            "Retry assessment when system available",
            "Seek professional medical advice",
            "Keep emergency contacts handy"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }
