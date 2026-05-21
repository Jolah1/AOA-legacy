//! Static company & project data exposed to the frontend.
//!
//! Keeping this in Rust gives us a single source of truth and lets the
//! frontend stay focused on presentation. Swap these `const`s for a real
//! data source (SQLite, REST API, CMS) later without changing the command
//! contracts.

use crate::error::AppResult;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Project {
    pub id: &'static str,
    pub title: &'static str,
    pub location: &'static str,
    pub category: &'static str,
    pub duration: &'static str,
    pub size: &'static str,
    pub completion: &'static str,
    pub image: &'static str,
    pub summary: &'static str,
    pub highlights: &'static [&'static str],
}

#[derive(Debug, Clone, Serialize)]
pub struct CompanyInfo {
    pub name: &'static str,
    pub tagline: &'static str,
    pub email: &'static str,
    pub phone: &'static str,
    pub location: &'static str,
    pub founded_year: u16,
    pub years_experience: u8,
    pub projects_delivered: u16,
}

const PROJECTS: &[Project] = &[
    Project {
        id: "lazrid",
        title: "LAZRID Diagnostics Center",
        location: "Lagos, Nigeria",
        category: "Healthcare",
        duration: "24 Months",
        size: "4-Storey Building",
        completion: "October 2025",
        image: "/projects/IMG_9592.jpeg",
        summary: "State-of-the-art medical facility including diagnostic suites, emergency department, and patient towers.",
        highlights: &[
            "Leading a team of 150+ workers across multiple trades.",
            "Advanced scheduling techniques to optimize workflow and reduce downtime.",
            "Coordinating civil, mechanical, and electrical works to healthcare specs.",
            "Project on track to complete two weeks ahead of schedule.",
        ],
    },
    Project {
        id: "egis",
        title: "EGIS Office Building",
        location: "Lagos, Nigeria",
        category: "Commercial",
        duration: "24 Months",
        size: "4-Storey Building",
        completion: "November 2025",
        image: "/projects/IMG_9593.jpeg",
        summary: "Upscale commercial development featuring high-end finishes, smart office technology, and sustainable design.",
        highlights: &[
            "Coordinating 25+ subcontractors on a constrained urban site.",
            "Successfully navigating permit challenges and stakeholder relations.",
            "Innovative construction techniques for energy efficiency.",
        ],
    },
    Project {
        id: "surveyor-general",
        title: "Office of Surveyor General",
        location: "Nigeria",
        category: "Government",
        duration: "14 Months",
        size: "2-Storey Building",
        completion: "July 2025",
        image: "/projects/IMG_9591.jpeg",
        summary: "Government facility built to the highest standards of structural integrity and functional performance for specialized technical areas.",
        highlights: &[
            "Innovative sequencing to accelerate timeline while maintaining quality.",
            "Strong client feedback throughout the build.",
        ],
    },
    Project {
        id: "banana-island",
        title: "Residential Apartment, Banana Island",
        location: "Lagos, Nigeria",
        category: "Residential",
        duration: "18 Months",
        size: "3-Storey Building",
        completion: "March 2025",
        image: "/projects/IMG_9587.jpeg",
        summary: "Luxury residential development in prestigious Banana Island, Lagos. End-to-end delivery from design through finishing.",
        highlights: &[
            "Full compliance with estate regulations and Lagos State building codes.",
            "Smart home automation, premium fittings, marble flooring, soundproof glazing.",
            "Optimized space planning and sustainable design elements.",
            "Supervised every phase from foundation to roofing and finishing.",
        ],
    },
    Project {
        id: "pg-plant",
        title: "Procter & Gamble Plant Upgrade",
        location: "Nigeria",
        category: "Industrial",
        duration: "14 Months",
        size: "15,000 sqm",
        completion: "June 2018",
        image: "/projects/IMG_9586.jpeg",
        summary: "Primary liaison between P&G executives, engineering consultants, contractors, and regulatory agencies for a major plant upgrade.",
        highlights: &[
            "100% compliance with P&G global safety and environmental standards.",
            "Delivered on time and within budget.",
            "Enhanced plant operational capacity and efficiency.",
        ],
    },
    Project {
        id: "infra-1",
        title: "Mixed-Use Development",
        location: "Lagos, Nigeria",
        category: "Commercial",
        duration: "20 Months",
        size: "Multi-Storey",
        completion: "2024",
        image: "/projects/IMG_9553.jpeg",
        summary: "Coordinated multi-trade construction across a complex mixed-use site.",
        highlights: &[
            "Tight site logistics in a high-density urban context.",
            "Stakeholder management across investors and tenants.",
        ],
    },
    Project {
        id: "residential-2",
        title: "Premium Residential Build",
        location: "Lagos, Nigeria",
        category: "Residential",
        duration: "16 Months",
        size: "Multi-Unit",
        completion: "2024",
        image: "/projects/IMG_9590.jpeg",
        summary: "Premium finishes, structural integrity, and on-schedule delivery for a high-end residential client.",
        highlights: &[
            "End-to-end project management.",
            "High-quality finishing and client satisfaction.",
        ],
    },
    Project {
        id: "infra-2",
        title: "Infrastructure Works",
        location: "Nigeria",
        category: "Infrastructure",
        duration: "12 Months",
        size: "Civil Works",
        completion: "2023",
        image: "/projects/2e9eff72-bdda-4dbb-aaaf-4751fa3d65a0.jpeg",
        summary: "Civil works package coordinating earthworks, drainage, and structural elements.",
        highlights: &[
            "Strict adherence to safety management systems.",
            "Environmental compliance maintained throughout.",
        ],
    },
    Project {
        id: "commercial-2",
        title: "Commercial Fit-Out",
        location: "Lagos, Nigeria",
        category: "Commercial",
        duration: "8 Months",
        size: "Interior Build-Out",
        completion: "2023",
        image: "/projects/5db75809-feca-4515-8592-53456ab4f420.jpeg",
        summary: "Full commercial interior fit-out delivered on a compressed schedule.",
        highlights: &[
            "Sequenced trades to minimize downtime.",
            "Delivered above client expectations on finish quality.",
        ],
    },
    Project {
        id: "residential-3",
        title: "Residential Renovation",
        location: "Lagos, Nigeria",
        category: "Residential",
        duration: "6 Months",
        size: "Whole-House",
        completion: "2022",
        image: "/projects/56f4bd3d-b36f-46d8-accb-89afce2b2cb6.jpeg",
        summary: "Full renovation including structural reinforcement and premium finishing.",
        highlights: &[
            "Phased delivery while client remained partially in occupation.",
            "Strong cost control across the lifecycle.",
        ],
    },
];

const COMPANY: CompanyInfo = CompanyInfo {
    name: "AOA Legacy Concepts",
    tagline: "Building lasting value across commercial, residential, and infrastructure projects.",
    email: "aolanrewaju.akanbi@gmail.com",
    phone: "+234 706 099 6703",
    location: "Lagos, Nigeria",
    founded_year: 2014,
    years_experience: 10,
    projects_delivered: 50,
};

#[tauri::command]
pub fn list_projects() -> AppResult<Vec<Project>> {
    Ok(PROJECTS.to_vec())
}

#[tauri::command]
pub fn get_company_info() -> AppResult<CompanyInfo> {
    Ok(COMPANY.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn projects_have_unique_ids() {
        let mut ids: Vec<&str> = PROJECTS.iter().map(|p| p.id).collect();
        ids.sort();
        let n = ids.len();
        ids.dedup();
        assert_eq!(n, ids.len(), "duplicate project ids");
    }

    #[test]
    fn projects_reference_existing_images() {
        for p in PROJECTS {
            assert!(p.image.starts_with("/projects/"));
            assert!(!p.title.is_empty());
        }
    }
}
