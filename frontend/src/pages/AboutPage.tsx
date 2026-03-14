import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const values = [
  {
    icon: '/images/Microscope 3.svg',
    title: 'Proven Results',
    description: 'We formulate with evidence-led actives and test for efficacy before anything reaches the shelf.',
  },
  {
    icon: '/images/Leaf.svg',
    title: 'Clean Ingredients',
    description: 'Our formulas focus on plant-based ingredients and avoid unnecessary fillers or harsh additives.',
  },
  {
    icon: '/images/Heart.svg',
    title: 'Kindness First',
    description: 'From cruelty-free development to responsible packaging, care is part of the product.',
  },
]

export default function AboutPage() {
  useEffect(() => {
    document.title = 'Calesta — About'
  }, [])

  return (
    <div className="bg-Mneutral-50 pt-[92px] text-Mneutral-900">
      <section className="section-template pt-[32px]">
        <div className="container-custom">
          <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
            <div className="overflow-hidden rounded-[32px]">
              <img src="/images/ss2.png" className="h-full w-full object-cover" alt="Calesta story" />
            </div>

            <div className="rounded-[32px] bg-white px-[20px] py-[24px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[80px]">
              <p className="mb-4 font-medium text__18 text-Mneutral-400">ABOUT CALESTA</p>
              <h1 className="text__56 font-medium">Beauty where science and nature meet.</h1>
              <div className="my-[32px] grid grid-cols-1 gap-[16px] text__18 text-Mneutral-600">
                <p>
                  Calesta was created to make skincare feel elevated, clear, and trustworthy. We believe visible results come from thoughtful formulation, not noise.
                </p>
                <p>
                  Every ritual is designed to feel refined in your hands and gentle on your skin, while staying grounded in ingredients that do real work.
                </p>
              </div>
              <Link to="/shop" className="pill-button">
                <span>SHOP NOW</span>
                <img src="/images/carbon_arrow-up-right (2).svg" alt="" className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-[40px] text-center md:py-[160px]">
        <div className="container-custom relative">
          <p className="font-medium text__18 text-Mneutral-400">OUR PHILOSOPHY</p>
          <h2 className="mt-[32px] text__48 leading-relaxed text-Mneutral-900/80">
            Every formula balances{' '}
            <span className="relative inline-block w-[90px] lg:w-[100px] align-middle">
              <span className="pointer-events-none opacity-0">A</span>
              <img
                src="/images/Rectangle 1.png"
                className="absolute left-1/2 top-1/2 h-[48px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white xl:h-[64px] xl:w-[100px]"
                alt=""
              />
            </span>{' '}
            high-performance actives with a softer sensorial experience,
            <span className="relative inline-block w-[90px] lg:w-[100px] align-middle">
              <span className="pointer-events-none opacity-0">A</span>
              <img
                src="/images/Rectangle 1-1.png"
                className="absolute left-1/2 top-1/2 h-[48px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white xl:h-[64px] xl:w-[100px]"
                alt=""
              />
            </span>{' '}
            so skincare feels as good as it performs.
          </h2>
        </div>
      </section>

      <section className="pt-0 section-template">
        <div className="container-custom grid grid-cols-1 gap-[12px] md:grid-cols-2">
          <div className="order-2 rounded-[32px] bg-white px-[20px] py-[24px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[80px] md:order-1">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">WHY CHOOSE US?</p>
            <h2 className="text__48">The Difference is in the Details</h2>

            <div className="mt-[56px] grid grid-cols-1 gap-[24px]">
              {values.map((value, index) => (
                <React.Fragment key={value.title}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-full border border-Mneutral-100">
                      <img src={value.icon} alt="" />
                    </div>
                    <div>
                      <h4 className="mb-[10px] text__20">{value.title}</h4>
                      <p className="text__16 text-Mneutral-600">{value.description}</p>
                    </div>
                  </div>
                  {index < values.length - 1 && <div className="h-px w-full bg-Mneutral-100" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="order-1 overflow-hidden rounded-[32px] md:order-2">
            <img src="/images/ss1.png" className="h-full w-full object-cover" alt="Ingredients" />
          </div>
        </div>
      </section>
    </div>
  )
}
